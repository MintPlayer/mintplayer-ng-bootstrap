import { LitElement, adoptStyles, html, nothing } from 'lit';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {
  IndexMachine,
  PointerArbiter,
  TransitionHandle,
  keyToIntent,
} from '@mintplayer/web-components/swiper-core';
import { carouselStyles } from '../styles';
import {
  CarouselAnimation,
  CarouselOrientation,
  CarouselPausedChangeEventDetail,
  CarouselSlideChangeEventDetail,
} from '../types';

/**
 * `<mp-carousel>` — Bootstrap-styled carousel web component.
 *
 * Slides are the consumer's light-DOM children (`<img>`, `<div>`, anything —
 * except elements slotted `play-pause`). The element stamps `slot="s0…sN-1"`
 * onto them and projects each into its own shadow wrapper cell, which is where
 * per-slide ARIA and content sizing live. One shadow template serves every
 * mode: `animation` (`slide`|`fade`|`none`) and `orientation`
 * (`horizontal`|`vertical`) are host attributes selected by CSS.
 *
 * Two interaction tiers:
 *  - JS on: a swiper-core PointerArbiter + IndexMachine drive a transform
 *    track (slide) or a grid-stacked crossfade (fade).
 *  - JS off (server-rendered DSD): the same shadow radios/labels are a pure
 *    CSS state machine — indicators, prev/next with wrap-around, and native
 *    radiogroup arrow keys all work. Slides render through the default slot
 *    (`.nojs-cell`); the `slot="sN"` stamping automatically empties it once
 *    the element upgrades. `data-js` gates every no-JS-only rule.
 *
 * The checked radio is the pre-upgrade index store; on upgrade it seeds the
 * machine and stays synchronized (indicator active state is `:checked` CSS in
 * both tiers).
 *
 * Height contract (see docs/prd/carousel-wc.md §5.3): horizontal + fade size
 * the viewport to the CURRENT slide, vertical to the LARGEST slide — measured
 * by one ResizeObserver over the slotted slides (never over anything this
 * element writes to), published as two host custom properties. The vertical
 * max height is also the transform distance unit, so layout and motion cannot
 * disagree.
 */
export class MpCarousel extends LitElement {
  static override styles = [carouselStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'animation',
      'orientation',
      'interval',
      'wrap',
      'indicators',
      'keyboard-events',
      'paused',
    ];
  }

  #slides: HTMLElement[] = [];
  #index = 0;
  /** Index read from the DSD's checked radio before the chrome is replaced. */
  #dsdIndex: number | null = null;

  #machine: IndexMachine | null = null;
  #arbiter: PointerArbiter | null = null;
  #mutations: MutationObserver | null = null;
  #resize: ResizeObserver | null = null;
  #heights = new Map<Element, number>();
  #maxSlideHeight = 0;

  #autoplayTimer: ReturnType<typeof setInterval> | null = null;
  #reducedMotion: MediaQueryList | null = null;
  /** Light-DOM element currently teleported into a wrap cell, if any. */
  #teleported: { el: HTMLElement; home: string } | null = null;
  /** Guards paused-change: only the single write path emits. */
  #writingPaused = false;

  // ---- element lifecycle ----------------------------------------------------

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    // DSD handoff: ALWAYS destructive — unlike mp-shell/mp-navbar (static,
    // branch-free chrome that true hydration can adopt), the carousel's
    // render() is legitimately state-dependent (count-dependent parts, the
    // play/pause branch, interactive viewport attributes), so
    // lit-element-hydrate-support's hydrate() throws structural mismatches.
    // Returning the existing root DIRECTLY (not via the patched super)
    // side-steps its hydrate flag; styles are adopted manually because only
    // the original createRenderRoot would have done it. The DSD chrome's one
    // job — the interactive no-JS render before upgrade — is already done.
    // Carousel addition: the checked radio in the inert chrome is the slide
    // the no-JS user navigated to; capture it before clearing so the upgrade
    // lands on the same slide.
    if (this.shadowRoot) {
      const radios = [...this.shadowRoot.querySelectorAll<HTMLInputElement>('.car-radio')];
      const checked = radios.findIndex((r) => r.checked);
      if (checked > 0) this.#dsdIndex = checked;
      this.shadowRoot.replaceChildren();
      adoptStyles(this.shadowRoot, (this.constructor as typeof MpCarousel).elementStyles ?? []);
      return this.shadowRoot;
    }
    return super.createRenderRoot();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Disengage the no-JS CSS state machine; from here JS owns the visuals.
    this.setAttribute('data-js', '');
    // The host is the labelled APG region (aria-label passes through natively).
    if (!this.hasAttribute('role')) this.setAttribute('role', 'region');
    if (!this.hasAttribute('aria-roledescription')) this.setAttribute('aria-roledescription', 'carousel');

    if (typeof window !== 'undefined' && window.matchMedia && !this.#reducedMotion) {
      this.#reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    }
    this.#reducedMotion?.addEventListener('change', this.#onReducedMotionChange);

    // Re-arm observers on reconnect (fresh connect defers to firstUpdated,
    // where the shadow chrome exists).
    if (this.hasUpdated) {
      this.#observe();
      this.#syncSlides();
      this.#syncAutoplay();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#reducedMotion?.removeEventListener('change', this.#onReducedMotionChange);
    this.#mutations?.disconnect();
    this.#resize?.disconnect();
    this.#arbiter?.abort();
    this.#clearAutoplay();
  }

  protected override firstUpdated(): void {
    this.#ensureEngine();
    this.#observe();
    this.#syncSlides();
    const initial = this.#dsdIndex;
    this.#dsdIndex = null;
    if (initial !== null && initial < this.#slides.length) {
      this.#machine?.goto(initial, { animate: false });
    } else {
      this.#applyRatio(this.#index);
    }
    this.#syncAutoplay();

    const track = this.#trackEl;
    if (track) {
      // Manual, non-passive listeners: host frameworks (and Lit's declarative
      // events) register touch listeners passively, which silently ignores the
      // preventDefault() the Firefox-Android pull-to-refresh defence needs.
      track.addEventListener('touchstart', this.#onTouchStart, { passive: true });
      track.addEventListener('touchmove', this.#onTouchMove, { passive: false });
      track.addEventListener('touchend', this.#onTouchEnd, { passive: false });
      track.addEventListener('touchcancel', this.#onTouchCancel, { passive: true });
    }
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue === newValue) return;
    switch (name) {
      case 'orientation':
        this.#arbiter?.setOrientation(this.#orientation);
        this.#applyHeights();
        this.#applyRatio(this.#index);
        this.requestUpdate();
        break;
      case 'animation':
        this.#machine?.setConfig({ durationMs: this.#durationMs });
        this.#applyHeights();
        this.#applyRatio(this.#index);
        this.requestUpdate();
        break;
      case 'wrap':
        this.#machine?.setConfig({ wrap: this.#wrap });
        break;
      case 'interval':
        this.#syncAutoplay();
        this.requestUpdate();
        break;
      case 'paused':
        this.#syncAutoplay();
        this.requestUpdate();
        if (!this.#writingPaused) {
          // Consumer wrote the attribute: honour it silently (no event echo).
        }
        break;
      case 'keyboard-events':
      case 'indicators':
        this.requestUpdate();
        break;
    }
  }

  // ---- public API -------------------------------------------------------------

  /** Committed slide index. Setting it jumps without animation. */
  get index(): number {
    return this.#index;
  }
  set index(value: number) {
    this.#machine?.goto(value, { animate: false });
  }

  // Config is attribute-only, DELIBERATELY not exposed as prototype
  // properties: the no-JS CSS and the DSD injector select on the attributes,
  // and framework bridges (@lit/react) strip prototype-matching props from
  // server HTML to set them as client-side properties — which would erase
  // exactly the attributes the no-JS tier needs (navbar/shell doctrine).
  // `interval` and `paused` are the exception (client-only semantics), with
  // reflecting setters for property bindings.

  get #animation(): CarouselAnimation {
    const value = this.getAttribute('animation');
    return value === 'fade' || value === 'none' ? value : 'slide';
  }

  get #orientation(): CarouselOrientation {
    return this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal';
  }

  get #wrap(): boolean {
    return this.getAttribute('wrap') !== 'false';
  }

  get #keyboardEvents(): boolean {
    return this.getAttribute('keyboard-events') !== 'false';
  }

  get interval(): number {
    const value = Number(this.getAttribute('interval'));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  set interval(value: number | string | null | undefined) {
    const ms = Number(value);
    if (Number.isFinite(ms) && ms > 0) this.setAttribute('interval', String(ms));
    else this.removeAttribute('interval');
  }

  get paused(): boolean {
    return this.hasAttribute('paused');
  }
  set paused(value: boolean | string | null | undefined) {
    // Property writes are programmatic: reflect silently (no paused-change).
    this.#setPaused(value === true || value === '' || value === 'true', false);
  }

  previous(): void {
    this.#machine?.previous();
  }

  next(): void {
    this.#machine?.next();
  }

  goto(index: number, opts: { animate?: boolean } = {}): void {
    this.#machine?.goto(index, opts);
  }

  play(): void {
    this.#setPaused(false);
  }

  pause(): void {
    this.#setPaused(true);
  }

  togglePaused = (): void => {
    this.#setPaused(!this.paused);
  };

  // ---- engine wiring ----------------------------------------------------------

  #ensureEngine(): void {
    if (this.#machine) return;
    this.#machine = new IndexMachine(
      {
        applyOffsetRatio: (ratio) => this.#applyRatio(ratio),
        runTransition: (from, to, duration, onDone) => this.#runTransition(from, to, duration, onDone),
      },
      {
        onIndexChange: (index) => this.#onIndexChange(index),
        onAnimationStart: () => {
          this.#innerEl?.setAttribute('aria-busy', 'true');
          this.#emit('animation-start', undefined);
        },
        onAnimationEnd: () => {
          this.#innerEl?.removeAttribute('aria-busy');
          this.#emit('animation-end', undefined);
        },
      },
      {
        count: this.#slides.length,
        wrap: this.#wrap,
        durationMs: this.#durationMs,
        minimumOffsetPx: 50,
        prefersReducedMotion: () => this.#reducedMotion?.matches ?? false,
      },
    );
    this.#arbiter = new PointerArbiter(
      { orientation: this.#orientation },
      {
        onDragStart: () => this.#machine?.beginDrag(),
        onDragMove: (deltaPx) => this.#machine?.dragBy(deltaPx, this.#extent()),
        onDragEnd: (deltaPx) => this.#machine?.endDrag(deltaPx, this.#extent()),
      },
    );
  }

  get #durationMs(): number {
    return this.#animation === 'none' ? 0 : 500;
  }

  /** Drag/transform distance for one slide, in px. */
  #extent(): number {
    return this.#orientation === 'horizontal'
      ? this.#innerEl?.clientWidth ?? 0
      : this.#maxSlideHeight;
  }

  get #innerEl(): HTMLElement | null {
    return this.renderRoot?.querySelector('.carousel-inner') ?? null;
  }

  get #trackEl(): HTMLElement | null {
    return this.renderRoot?.querySelector('.carousel-track') ?? null;
  }

  // ---- slides -----------------------------------------------------------------

  #observe(): void {
    if (!this.#mutations) {
      this.#mutations = new MutationObserver(() => this.#syncSlides());
    }
    this.#mutations.observe(this, { childList: true });
    if (!this.#resize && typeof ResizeObserver !== 'undefined') {
      this.#resize = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.#heights.set(entry.target, entry.contentRect.height);
        }
        this.#applyHeights();
      });
    }
  }

  #collectSlides(): HTMLElement[] {
    return [...this.children].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.getAttribute('slot') !== 'play-pause',
    );
  }

  #syncSlides(): void {
    const slides = this.#collectSlides();
    const changed =
      slides.length !== this.#slides.length || slides.some((s, i) => s !== this.#slides[i]);
    if (!changed && !this.#teleported) {
      // Even without membership changes, re-stamp in case a framework
      // re-created an element without its slot attribute.
      slides.forEach((s, i) => {
        if (s.getAttribute('slot') !== `s${i}`) s.setAttribute('slot', `s${i}`);
      });
      return;
    }
    // A membership change mid-transition: settle the transition first so the
    // teleport restore doesn't race the new projection.
    this.#machine?.interrupt();
    this.#restoreTeleport();

    this.#slides = slides;
    slides.forEach((s, i) => s.setAttribute('slot', `s${i}`));

    // Measure the slides (and only the slides — never elements we size).
    this.#resize?.disconnect();
    this.#heights = new Map(slides.map((s) => [s, s.offsetHeight || 0]));
    slides.forEach((s) => this.#resize?.observe(s));
    this.#applyHeights();

    // LCP: the first slide's image loads eagerly, the rest lazily.
    slides.forEach((s, i) => {
      const img = s instanceof HTMLImageElement ? s : s.querySelector('img');
      img?.setAttribute('fetchpriority', i === 0 ? 'high' : 'low');
    });

    this.#machine?.setConfig({ count: slides.length });
    if (this.#index >= slides.length) {
      this.#index = Math.max(0, slides.length - 1);
    }
    this.requestUpdate();
    this.updateComplete.then(() => this.#applyRatio(this.#machine?.getIndex() ?? this.#index));
  }

  #applyHeights(): void {
    const heights = this.#slides.map((s) => this.#heights.get(s) ?? 0);
    const max = heights.length ? Math.max(...heights) : 0;
    const current = heights[this.#index] ?? max;
    this.#maxSlideHeight = max;

    // >10px validity gate (carried from master): images measure 0 until their
    // bytes arrive; an invalid measurement must not collapse the viewport.
    const viewport = this.#orientation === 'vertical' ? max : current;
    if (viewport > 10) {
      this.style.setProperty('--mp-carousel-viewport-height', `${viewport}px`);
    } else {
      this.style.removeProperty('--mp-carousel-viewport-height');
    }
    if (this.#orientation === 'vertical' && max > 10) {
      this.style.setProperty('--mp-carousel-slide-height', `${max}px`);
    } else {
      this.style.removeProperty('--mp-carousel-slide-height');
    }
  }

  // ---- position / transitions ---------------------------------------------------

  /**
   * Park the track at a logical ratio (slide units; may transiently sit
   * outside [0, N-1] during a wrap). Physical mapping: the wrap-before cell
   * occupies position 0, so physical = ratio + 1.
   */
  #applyRatio(ratio: number): void {
    const track = this.#trackEl;
    if (!track) return;
    if (this.#animation === 'fade') {
      // Grid stacking owns the layout; a stale transform from a previous
      // slide-mode session would shift the whole stack.
      track.style.transform = '';
      if (Number.isInteger(ratio)) this.#setActiveCell(this.#wrapIndex(ratio));
      return;
    }
    this.#syncDragTeleport(ratio);
    track.style.transform = this.#transformFor(ratio);
  }

  #transformFor(ratio: number): string {
    const physical = ratio + 1;
    return this.#orientation === 'horizontal'
      ? `translate3d(${-physical * 100}%, 0, 0)`
      : `translate3d(0, ${-physical * this.#maxSlideHeight}px, 0)`;
  }

  #wrapIndex(raw: number): number {
    const n = this.#slides.length;
    return n > 0 ? ((raw % n) + n) % n : 0;
  }

  /** Visual `.active` (fade opacity target) — managed imperatively, not bound. */
  #setActiveCell(index: number): void {
    this.renderRoot?.querySelectorAll('.carousel-item[data-i]').forEach((cell) => {
      cell.classList.toggle('active', Number((cell as HTMLElement).dataset['i']) === index);
    });
  }

  #runTransition(from: number, to: number, duration: number, onDone: () => void): TransitionHandle {
    if (this.#animation === 'fade') {
      this.#setActiveCell(this.#wrapIndex(to));
      let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        timer = null;
        onDone();
      }, duration);
      return {
        finish: () => {
          if (timer !== null) {
            clearTimeout(timer);
            timer = null;
            onDone();
          }
        },
        cancel: () => {
          if (timer !== null) {
            clearTimeout(timer);
            timer = null;
          }
        },
      };
    }

    // slide: a WAAPI transform animation on the track. A wrapping target
    // (to === -1 | N) teleports the destination slide into the matching wrap
    // cell for the duration; restore happens inside settle, BEFORE onDone —
    // the machine's completion then re-parks the track at the committed index
    // in the same synchronous run, so no intermediate frame can paint.
    const track = this.#trackEl;
    if (!track) {
      onDone();
      return { finish: () => undefined, cancel: () => undefined };
    }
    this.#setupWrapTeleport(to);
    if (typeof track.animate !== 'function') {
      // No Web Animations API (jsdom, ancient browsers): settle instantly.
      this.#restoreTeleport();
      onDone();
      return { finish: () => undefined, cancel: () => undefined };
    }
    const animation = track.animate(
      [{ transform: this.#transformFor(from) }, { transform: this.#transformFor(to) }],
      { duration, easing: 'ease', fill: 'forwards' },
    );
    let settled = false;
    const settle = (done: boolean) => {
      if (settled) return;
      settled = true;
      animation.cancel();
      this.#restoreTeleport();
      if (done) onDone();
    };
    animation.onfinish = () => settle(true);
    return {
      finish: () => settle(true),
      cancel: () => settle(false),
    };
  }

  /** Teleport the destination slide into a wrap cell for a wrapping move. */
  #setupWrapTeleport(to: number): void {
    const n = this.#slides.length;
    if (n < 2) return;
    if (to === n) this.#teleport(this.#slides[0], 'wrapA');
    else if (to === -1) this.#teleport(this.#slides[n - 1], 'wrapB');
  }

  /** During a live drag past the deck's edges, keep the wrap cell populated. */
  #syncDragTeleport(ratio: number): void {
    const n = this.#slides.length;
    if (n < 2 || !this.#wrap) return;
    if (ratio > n - 1) this.#teleport(this.#slides[0], 'wrapA');
    else if (ratio < 0) this.#teleport(this.#slides[n - 1], 'wrapB');
    else if (this.#teleported && Number.isInteger(ratio)) this.#restoreTeleport();
  }

  #teleport(el: HTMLElement | undefined, cell: 'wrapA' | 'wrapB'): void {
    if (!el || this.#teleported?.el === el) return;
    this.#restoreTeleport();
    this.#teleported = { el, home: el.getAttribute('slot') ?? '' };
    el.setAttribute('slot', cell);
  }

  #restoreTeleport(): void {
    if (!this.#teleported) return;
    this.#teleported.el.setAttribute('slot', this.#teleported.home);
    this.#teleported = null;
  }

  // ---- state sync -----------------------------------------------------------

  #onIndexChange(index: number): void {
    this.#index = index;
    // The radios stay the semantic index store (indicator active styling is
    // `:checked` CSS in both tiers). Setting `.checked` never fires `change`,
    // so this cannot loop.
    const radios = this.renderRoot?.querySelectorAll<HTMLInputElement>('.car-radio');
    radios?.forEach((r, i) => (r.checked = i === index));
    if (this.#animation !== 'fade') this.#setActiveCell(index);
    this.#applyHeights();
    this.requestUpdate();
    this.#emit<CarouselSlideChangeEventDetail>('slide-change', { index });
  }

  /** Single write path for `paused` + its event (programmatic writes stay silent). */
  #setPaused(paused: boolean, emit = true): void {
    if (paused === this.paused) return;
    this.#writingPaused = true;
    if (paused) this.setAttribute('paused', '');
    else this.removeAttribute('paused');
    this.#writingPaused = false;
    if (emit) this.#emit<CarouselPausedChangeEventDetail>('paused-change', { paused });
  }

  #onReducedMotionChange = (): void => {
    this.#syncAutoplay();
    this.requestUpdate();
  };

  #syncAutoplay(): void {
    this.#clearAutoplay();
    const interval = this.interval;
    if (interval > 0 && !this.paused && !(this.#reducedMotion?.matches ?? false) && this.isConnected) {
      this.#autoplayTimer = setInterval(() => this.next(), interval);
    }
  }

  #clearAutoplay(): void {
    if (this.#autoplayTimer !== null) {
      clearInterval(this.#autoplayTimer);
      this.#autoplayTimer = null;
    }
  }

  /**
   * `polite` announces manual navigation; `off` keeps rotation from spamming
   * the screen reader. Rotation is only actually happening when an interval is
   * set, not paused, and motion isn't reduced.
   */
  get #ariaLive(): 'off' | 'polite' {
    if (this.interval <= 0) return 'polite';
    if (this.paused) return 'polite';
    if (this.#reducedMotion?.matches) return 'polite';
    return 'off';
  }

  // ---- input handlers ---------------------------------------------------------

  #onTouchStart = (event: TouchEvent): void => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.#arbiter?.pointerDown(touch.clientX, touch.clientY);
  };

  #onTouchMove = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (!touch) return;
    if (this.#arbiter?.pointerMove(touch.clientX, touch.clientY)) {
      // Locked onto our axis: suppress native scroll/PTR, and stop the event
      // here so an ancestor carousel (nested composition) doesn't also react.
      event.preventDefault();
      event.stopPropagation();
    }
  };

  #onTouchEnd = (event: TouchEvent): void => {
    if (this.#arbiter?.pointerUp()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  #onTouchCancel = (): void => {
    this.#arbiter?.abort();
    this.#machine?.goto(this.#index, { animate: false });
  };

  #onKeydown = (event: KeyboardEvent): void => {
    // APG: only keys pressed on the viewport itself navigate — focusable
    // slide content (or a nested carousel) keeps its own keys.
    if (event.target !== event.currentTarget) return;
    if (!this.#keyboardEvents) return;
    const intent = keyToIntent(event.key, this.#orientation);
    if (!intent) return;
    event.preventDefault();
    this.#machine?.intent(intent);
  };

  /**
   * Direct radio interaction (arrow keys on the focused radio group). Label
   * clicks never reach here in the JS tier — they're intercepted to preserve
   * wrap direction.
   */
  #onRadioChange = (event: Event): void => {
    const radios = [...(this.renderRoot?.querySelectorAll<HTMLInputElement>('.car-radio') ?? [])];
    const index = radios.indexOf(event.target as HTMLInputElement);
    if (index >= 0 && index !== this.#index) this.#machine?.goto(index);
  };

  #onIndicatorClick(index: number, event: Event): void {
    event.preventDefault();
    this.#machine?.goto(index);
  }

  #onControlClick(direction: 'previous' | 'next', event: Event): void {
    // preventDefault stops the label from flipping its radio: the machine owns
    // the move (and its wrap DIRECTION, which the label's absolute target loses).
    event.preventDefault();
    this.#machine?.[direction]();
  }

  #emit<T>(name: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(name, { detail, bubbles: true, composed: true }));
  }

  // ---- template ---------------------------------------------------------------

  /**
   * Count-dependent CSS for the no-JS tier (and the `:checked`-driven control
   * pair reveal, which serves both tiers). Lives HERE — in render()'s single
   * source of truth — so the pre-rendered DSD chrome variants carry it too.
   */
  #perIndexCss(n: number): string {
    let css = '';
    for (let i = 0; i < n; i++) {
      const checked = `#s${i}:checked`;
      // Active control pair + indicator (both tiers).
      css += `${checked} ~ .carousel-controls .ctl-prev-${i}, ${checked} ~ .carousel-controls .ctl-next-${i} { display: flex; }`;
      css += `${checked} ~ .carousel-indicators label[for="s${i}"] { opacity: 1; }`;
      // Focus lives on the visually-hidden radio; paint its ring on the indicator.
      css += `#s${i}:focus-visible ~ .carousel-indicators label[for="s${i}"] { outline: 2px solid #fff; outline-offset: 2px; }`;
      // no-JS fade / vertical crossfade reveal.
      css += `:host(:not([data-js])) ${checked} ~ .carousel-inner .nojs-cell slot::slotted(:nth-child(${i + 1})) { opacity: 1; position: relative; z-index: 1; }`;
      // no-JS horizontal slide translation.
      css += `:host(:not([data-js]):not([animation="fade"]):not([orientation="vertical"])) ${checked} ~ .carousel-inner .nojs-cell { transform: translateX(${-i * 100}%); }`;
    }
    return css;
  }

  override render() {
    const n = this.#slides.length || Number(this.getAttribute('slide-count')) || 0;
    const index = this.#index;
    const interval = this.interval;
    // data-js is set by connectedCallback, which never runs during lit-ssr
    // chrome generation — and the ssr DOM shim has no querySelector anyway.
    const isBrowser = this.hasAttribute('data-js');
    const showPlayPause =
      interval > 0 || (isBrowser && this.querySelector('[slot="play-pause"]') !== null);

    return html`
      ${unsafeHTML(`<style>${this.#perIndexCss(n)}</style>`)}
      ${map(range(n), (i) => html`
        <input
          type="radio"
          id="s${i}"
          name="car"
          class="car-radio visually-hidden"
          aria-label="Slide ${i + 1}"
          ?checked=${i === index}
          @change=${this.#onRadioChange}
        />
      `)}
      <div
        class="carousel-inner"
        part="inner"
        tabindex=${isBrowser ? '0' : nothing}
        aria-live=${isBrowser ? this.#ariaLive : nothing}
        aria-atomic=${isBrowser ? 'false' : nothing}
        aria-orientation=${isBrowser ? this.#orientation : nothing}
        aria-keyshortcuts=${isBrowser && this.#keyboardEvents
          ? this.#orientation === 'horizontal'
            ? 'ArrowLeft ArrowRight Home End'
            : 'ArrowUp ArrowDown Home End'
          : nothing}
        @keydown=${this.#onKeydown}
      >
        <div class="carousel-track" part="track">
          <div class="carousel-item carousel-clone" aria-hidden="true"><slot name="wrapB"></slot></div>
          ${map(range(n), (i) => html`
            <div
              class="carousel-item"
              data-i=${i}
              role="group"
              aria-roledescription="slide"
              aria-label="${i + 1} of ${n}"
              aria-hidden=${i === index ? nothing : 'true'}
            >
              <slot name="s${i}"></slot>
            </div>
          `)}
          <div class="carousel-item carousel-clone" aria-hidden="true"><slot name="wrapA"></slot></div>
          <div class="carousel-item nojs-cell"><slot></slot></div>
        </div>
      </div>
      <div class="carousel-indicators" part="indicators">
        ${map(range(n), (i) => html`
          <label
            for="s${i}"
            data-bs-target
            aria-label="Slide ${i + 1}"
            aria-current=${i === index ? 'true' : nothing}
            @click=${(e: Event) => this.#onIndicatorClick(i, e)}
          ></label>
        `)}
      </div>
      <div class="carousel-controls" part="controls">
        ${map(range(n), (i) => html`
          <label
            class="carousel-control-prev ctl-prev-${i}"
            for="s${(i - 1 + n) % n}"
            role="button"
            aria-label="Previous"
            @click=${(e: Event) => this.#onControlClick('previous', e)}
          >
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Previous</span>
          </label>
          <label
            class="carousel-control-next ctl-next-${i}"
            for="s${(i + 1) % n}"
            role="button"
            aria-label="Next"
            @click=${(e: Event) => this.#onControlClick('next', e)}
          >
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Next</span>
          </label>
        `)}
      </div>
      ${showPlayPause
        ? html`
            <div class="carousel-play-pause" part="play-pause">
              <slot name="play-pause">
                <button
                  type="button"
                  class="carousel-play-pause-btn ${this.paused ? 'carousel-play-pause-paused' : 'carousel-play-pause-playing'}"
                  aria-pressed=${String(this.paused)}
                  aria-label=${this.paused ? 'Start automatic slide show' : 'Stop automatic slide show'}
                  @click=${this.togglePaused}
                >
                  <span class="carousel-play-pause-icon" aria-hidden="true"></span>
                </button>
              </slot>
            </div>
          `
        : nothing}
    `;
  }
}

if (!customElements.get('mp-carousel')) {
  customElements.define('mp-carousel', MpCarousel);
}
