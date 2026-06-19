import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  SwipeAnimationHandle,
  SwipeAnimationSpec,
  SwipeEngine,
  SwipeEngineHost,
  SwipeSlideState,
  SwipeTrackOffset,
} from '@mintplayer/web-components/swiper-core';
import { carouselStyles } from '../styles';
import type {
  CarouselAnimation,
  CarouselOrientation,
  CarouselPausedChangeEventDetail,
  CarouselSlideChangeEventDetail,
} from '../types';

/**
 * <mp-carousel>
 *
 * Framework-agnostic Bootstrap carousel. Slides are the element's light-DOM
 * children (any element — `<img>`, `<div>`, …), projected into the moving
 * track via a single default slot. In `slide` mode the first and last children
 * are cloned just outside the viewport so the loop is seamless.
 *
 * All swipe / keyboard / index logic is owned by the shared
 * {@link SwipeEngine}; this element is its DOM host — it applies margin offsets,
 * measures the container, and plays the slide transition via the Web Animations
 * API. The host stays in control of the active slide: it reads `index` /
 * listens for `slide-change`, and toggles auto-advance via `paused`.
 *
 *     <mp-carousel interval="4000" indicators>
 *       <img src="a.jpg" />
 *       <img src="b.jpg" />
 *     </mp-carousel>
 *
 * NOTE: the no-JS render (in-shadow `:checked` state machine + SSR DSD) and the
 * play/pause `toggle` slot are tracked Wave-1 follow-ups; this build covers the
 * full interactive (hydrated) behaviour.
 */
export class MpCarousel extends LitElement implements SwipeEngineHost {
  static override styles = [carouselStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'orientation',
      'animation',
      'interval',
      'wrap',
      'indicators',
      'keyboard-events',
      'aria-label',
      'paused',
    ];
  }

  private readonly engine: SwipeEngine;

  private trackEl: HTMLElement | null = null;
  private viewportEl: HTMLElement | null = null;
  private slotEl: HTMLSlotElement | null = null;
  private cloneBeforeEl: HTMLElement | null = null;
  private cloneAfterEl: HTMLElement | null = null;

  private slideEls: HTMLElement[] = [];
  private slideHeights: number[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private autoAdvanceId: ReturnType<typeof setInterval> | null = null;
  private reducedMotionQuery: MediaQueryList | null = null;
  private isAnimating = false;

  constructor() {
    super();
    this.engine = new SwipeEngine(
      this,
      {
        onIndexChange: (i) => this.handleIndexChange(i),
        onAnimationStart: () => {
          this.isAnimating = true;
          this.dispatchEvent(new CustomEvent('animation-start', { bubbles: true, composed: true }));
        },
        onAnimationEnd: () => {
          this.isAnimating = false;
          this.dispatchEvent(new CustomEvent('animation-end', { bubbles: true, composed: true }));
          this.requestUpdate();
        },
      },
      this.readConfig(),
    );
  }

  // ---- attribute-backed config --------------------------------------------

  // Config is attribute-backed but every member also has a reflecting setter so
  // framework wrappers (which bind element *properties*) and plain attribute
  // authoring both work. Setters write the attribute; attributeChangedCallback
  // does the rest (engine sync + re-render).
  get orientation(): CarouselOrientation {
    return this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal';
  }
  set orientation(v: CarouselOrientation) {
    this.setAttribute('orientation', v);
  }
  get animation(): CarouselAnimation {
    const v = this.getAttribute('animation');
    return v === 'fade' || v === 'none' ? v : 'slide';
  }
  set animation(v: CarouselAnimation) {
    this.setAttribute('animation', v);
  }
  get interval(): number {
    const v = Number(this.getAttribute('interval'));
    return Number.isFinite(v) && v > 0 ? v : 0;
  }
  set interval(v: number | null) {
    if (v == null) this.removeAttribute('interval');
    else this.setAttribute('interval', String(v));
  }
  get wrap(): boolean {
    return !this.hasAttribute('wrap') || this.getAttribute('wrap') !== 'false';
  }
  set wrap(v: boolean) {
    if (v === false) this.setAttribute('wrap', 'false');
    else this.removeAttribute('wrap');
  }
  get indicators(): boolean {
    return this.hasAttribute('indicators') && this.getAttribute('indicators') !== 'false';
  }
  set indicators(v: boolean) {
    if (v) this.setAttribute('indicators', '');
    else this.removeAttribute('indicators');
  }
  get keyboardEvents(): boolean {
    return !this.hasAttribute('keyboard-events') || this.getAttribute('keyboard-events') !== 'false';
  }
  set keyboardEvents(v: boolean) {
    if (v === false) this.setAttribute('keyboard-events', 'false');
    else this.removeAttribute('keyboard-events');
  }

  /** Active slide index (0-based). Setting it navigates without animation. */
  get index(): number {
    return this.engine.getIndex();
  }
  set index(value: number) {
    // engine.setIndex → onIndexChange → handleIndexChange marks the active slide.
    this.engine.setIndex(value);
  }

  /** Whether auto-advance is suspended. */
  get paused(): boolean {
    return this.hasAttribute('paused') && this.getAttribute('paused') !== 'false';
  }
  set paused(value: boolean) {
    if (value) this.setAttribute('paused', '');
    else this.removeAttribute('paused');
  }

  private readConfig() {
    return {
      orientation: this.orientation,
      animation: this.animation,
      keyboardEvents: this.keyboardEvents,
    };
  }

  override attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (oldVal === newVal) return;
    this.engine.setConfig(this.readConfig());
    if (name === 'animation' || name === 'orientation') {
      // clone presence + track flow depend on these
      this.refreshSlides();
    }
    if (name === 'interval' || name === 'paused') {
      this.restartAutoAdvance();
    }
    if (name === 'paused') {
      this.dispatchEvent(
        new CustomEvent<CarouselPausedChangeEventDetail>('paused-change', {
          detail: { paused: this.paused },
          bubbles: true,
          composed: true,
        }),
      );
    }
    this.requestUpdate();
  }

  // ---- lifecycle -----------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    this.reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    this.reducedMotionQuery?.addEventListener('change', this.onReducedMotionChange);
  }

  override firstUpdated(): void {
    const root = this.shadowRoot!;
    this.trackEl = root.querySelector('.carousel-track');
    this.viewportEl = root.querySelector('.carousel-inner');
    this.slotEl = root.querySelector('slot');
    this.cloneBeforeEl = root.querySelector('.clone-before');
    this.cloneAfterEl = root.querySelector('.clone-after');

    this.trackEl?.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.trackEl?.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.trackEl?.addEventListener('touchend', this.onTouchEnd, { passive: false });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.measureSlides());
      if (this.viewportEl) this.resizeObserver.observe(this.viewportEl);
    }

    this.refreshSlides();
    this.engine.markReady();
    this.restartAutoAdvance();
  }

  override disconnectedCallback(): void {
    this.trackEl?.removeEventListener('touchstart', this.onTouchStart);
    this.trackEl?.removeEventListener('touchmove', this.onTouchMove);
    this.trackEl?.removeEventListener('touchend', this.onTouchEnd);
    this.resizeObserver?.disconnect();
    this.reducedMotionQuery?.removeEventListener('change', this.onReducedMotionChange);
    this.clearAutoAdvance();
    this.engine.destroy();
    super.disconnectedCallback();
  }

  // ---- SwipeEngineHost ------------------------------------------------------

  applyTrackOffset(offset: SwipeTrackOffset): void {
    const t = this.trackEl;
    if (!t) return;
    t.style.marginLeft = offset.marginLeftPercent != null ? `${offset.marginLeftPercent}%` : '';
    t.style.marginRight = offset.marginRightPercent != null ? `${offset.marginRightPercent}%` : '';
    t.style.marginTop = offset.marginTopPx != null ? `${offset.marginTopPx}px` : '';
    t.style.marginBottom = offset.marginBottomPx != null ? `${offset.marginBottomPx}px` : '';
    t.style.touchAction = this.engine.touchAction;
  }

  getContainerLength(): number {
    if (this.orientation === 'horizontal') {
      return this.viewportEl?.clientWidth ?? 0;
    }
    return this.maxSlideHeight();
  }

  runAnimation(spec: SwipeAnimationSpec, onDone: () => void): SwipeAnimationHandle {
    const track = this.trackEl;
    if (!track) {
      onDone();
      return { finish: () => {}, cancel: () => {} };
    }
    const primary = spec.orientation === 'horizontal' ? 'marginLeft' : 'marginTop';
    const secondary = spec.orientation === 'horizontal' ? 'marginRight' : 'marginBottom';
    const anim = track.animate(
      [
        { [primary]: `${spec.fromPrimaryPx}px`, [secondary]: `${spec.fromSecondaryPx}px` },
        { [primary]: `${spec.toPrimaryPx}px`, [secondary]: `${spec.toSecondaryPx}px` },
      ],
      { duration: spec.durationMs, easing: 'ease', fill: 'both' },
    );
    let settled = false;
    const settle = (run: boolean) => {
      if (settled) return;
      settled = true;
      // Bake the end margins into inline style, then drop the animation so the
      // engine's resting (percentage) offset can take over on the next render.
      try { anim.commitStyles(); } catch { /* element detached */ }
      anim.cancel();
      if (run) onDone();
    };
    anim.onfinish = () => settle(true);
    return {
      finish: () => { anim.finish(); },
      cancel: () => { settled = true; anim.cancel(); },
    };
  }

  // ---- slides + measurement ------------------------------------------------

  private onSlotChange = (): void => {
    this.refreshSlides();
  };

  /** Re-read slotted slides, rebuild clones, feed the engine, mark active. */
  private refreshSlides(): void {
    this.slideEls = this.slotEl
      ? (this.slotEl.assignedElements({ flatten: true }) as HTMLElement[])
      : [];
    this.rebuildClones();
    this.measureSlides();
    this.updateActiveSlide();
  }

  private rebuildClones(): void {
    if (!this.cloneBeforeEl || !this.cloneAfterEl) return;
    this.cloneBeforeEl.replaceChildren();
    this.cloneAfterEl.replaceChildren();
    // Seamless looping only matters in slide mode; fade/none overlap or cut.
    if (this.animation !== 'slide' || this.slideEls.length === 0) return;
    const first = this.slideEls[0];
    const last = this.slideEls[this.slideEls.length - 1];
    this.cloneBeforeEl.appendChild(last.cloneNode(true));
    this.cloneAfterEl.appendChild(first.cloneNode(true));
  }

  private measureSlides(): void {
    this.slideHeights = this.slideEls.map((el) => el.offsetHeight || 0);
    const useClones = this.animation === 'slide' && this.slideEls.length > 0;
    const real: SwipeSlideState[] = this.slideEls.map((_, i) => ({
      offside: false,
      height: this.slideHeights[i] || 0,
    }));
    const slides: SwipeSlideState[] = useClones
      ? [
          { offside: true, height: this.slideHeights[this.slideHeights.length - 1] || 0 },
          ...real,
          { offside: true, height: this.slideHeights[0] || 0 },
        ]
      : real;
    this.engine.setSlides(slides);
    const w = this.viewportEl?.clientWidth ?? 0;
    this.engine.setContainerSize(w, this.maxSlideHeight());
    this.updateSlideHeightVar();
    this.requestUpdate();
  }

  private maxSlideHeight(): number {
    return this.slideHeights.length ? Math.max(...this.slideHeights, 1) : 1;
  }

  /**
   * Vertical mode pins every slide cell to the tallest slide's height (so the
   * column advances by a uniform step) via an inherited custom property the
   * cell CSS reads; images inside use `object-fit: contain`, so they are
   * letterboxed within that box rather than stretched. Horizontal mode clears
   * the property and lets each slide keep its natural (aspect-correct) height.
   */
  private updateSlideHeightVar(): void {
    if (this.orientation === 'vertical') {
      this.style.setProperty('--mp-carousel-slide-height', `${this.maxSlideHeight()}px`);
    } else {
      this.style.removeProperty('--mp-carousel-slide-height');
    }
  }

  private updateActiveSlide(): void {
    const active = this.engine.getIndex();
    this.slideEls.forEach((el, i) => el.classList.toggle('active', i === active));
  }

  private handleIndexChange(i: number): void {
    this.updateActiveSlide();
    this.dispatchEvent(
      new CustomEvent<CarouselSlideChangeEventDetail>('slide-change', {
        detail: { index: i },
        bubbles: true,
        composed: true,
      }),
    );
    this.requestUpdate();
  }

  // ---- auto-advance --------------------------------------------------------

  private onReducedMotionChange = (): void => this.restartAutoAdvance();

  private restartAutoAdvance(): void {
    this.clearAutoAdvance();
    const reduce = this.reducedMotionQuery?.matches ?? false;
    if (this.interval > 0 && !this.paused && !reduce) {
      this.autoAdvanceId = setInterval(() => this.next(), this.interval);
    }
  }

  private clearAutoAdvance(): void {
    if (this.autoAdvanceId) {
      clearInterval(this.autoAdvanceId);
      this.autoAdvanceId = null;
    }
  }

  // ---- public navigation API -----------------------------------------------

  play(): void { this.paused = false; }
  pause(): void { this.paused = true; }
  togglePaused(): void { this.paused = !this.paused; }

  previous(): void {
    if (!this.wrap && this.engine.getIndex() === 0) return;
    this.engine.previous();
  }
  next(): void {
    if (!this.wrap && this.engine.getIndex() === this.slideEls.length - 1) return;
    this.engine.next();
  }
  goto(index: number): void {
    if (index < 0 || index >= this.slideEls.length) return;
    this.engine.goto(index);
  }

  // ---- pointer + keyboard --------------------------------------------------

  private onTouchStart = (ev: TouchEvent): void => {
    if (ev.touches.length === 1) {
      this.engine.pointerDown(ev.touches[0].clientX, ev.touches[0].clientY);
    }
  };
  private onTouchMove = (ev: TouchEvent): void => {
    if (this.engine.pointerMove(ev.touches[0].clientX, ev.touches[0].clientY)) {
      ev.preventDefault();
    }
  };
  private onTouchEnd = (ev: TouchEvent): void => {
    if (this.engine.pointerUp()) ev.preventDefault();
  };

  private onKeydown = (ev: KeyboardEvent): void => {
    // Only when the viewport itself is focused, so a focusable element inside a
    // slide keeps native key handling.
    if (ev.target !== this.viewportEl) return;
    if (this.engine.onKeyPress(ev.key)) ev.preventDefault();
  };

  // ---- render --------------------------------------------------------------

  private get slideAriaLive(): 'off' | 'polite' {
    if (this.interval <= 0 || this.paused) return 'polite';
    if (this.reducedMotionQuery?.matches) return 'polite';
    return 'off';
  }

  override render(): TemplateResult {
    const vertical = this.orientation === 'vertical';
    const active = this.engine.getIndex();
    const carouselClasses = classMap({
      carousel: true,
      'mx-auto': true,
      slide: this.animation === 'slide',
      fade: this.animation === 'fade',
      'carousel-vertical': vertical,
    });
    const height = this.engine.currentSlideHeight();
    const viewportStyle = styleMap({ height: height && height > 0 ? `${height}px` : '200px' });

    return html`
      <div
        class=${carouselClasses}
        role="region"
        aria-roledescription="carousel"
        aria-label=${this.getAttribute('aria-label') ?? nothing}
      >
        ${this.interval > 0 ? this.renderPlayPause() : nothing}
        ${this.indicators ? this.renderIndicators(active, vertical) : nothing}
        <div
          class="carousel-inner"
          tabindex="0"
          aria-live=${this.slideAriaLive}
          aria-busy=${this.isAnimating ? 'true' : nothing}
          style=${viewportStyle}
          @keydown=${this.onKeydown}
        >
          <div class="carousel-track">
            <div class="carousel-clone clone-before" aria-hidden="true"></div>
            <slot @slotchange=${this.onSlotChange}></slot>
            <div class="carousel-clone clone-after" aria-hidden="true"></div>
          </div>
        </div>
        <button
          class=${classMap({ 'carousel-control-prev': true, 'carousel-control-vertical': vertical })}
          type="button"
          aria-label="Previous slide"
          @click=${() => this.previous()}
        >
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button
          class=${classMap({ 'carousel-control-next': true, 'carousel-control-vertical': vertical })}
          type="button"
          aria-label="Next slide"
          @click=${() => this.next()}
        >
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </div>
    `;
  }

  private renderIndicators(active: number, vertical: boolean): TemplateResult {
    return html`
      <div class=${classMap({ 'carousel-indicators': true, 'carousel-indicators-vertical': vertical })}>
        ${this.slideEls.map(
          (_, i) => html`
            <button
              type="button"
              data-bs-target
              class=${classMap({ active: active === i })}
              aria-current=${active === i ? 'true' : nothing}
              aria-label=${`Slide ${i + 1}`}
              @click=${() => this.goto(i)}
            ></button>
          `,
        )}
      </div>
    `;
  }

  private renderPlayPause(): TemplateResult {
    const paused = this.paused;
    return html`
      <div class="carousel-play-pause">
        <button
          type="button"
          class=${classMap({
            'carousel-play-pause-btn': true,
            'carousel-play-pause-paused': paused,
            'carousel-play-pause-playing': !paused,
          })}
          aria-pressed=${paused ? 'true' : 'false'}
          aria-label=${paused ? 'Resume auto-advance' : 'Pause auto-advance'}
          @click=${() => this.togglePaused()}
        >
          <span class="carousel-play-pause-icon" aria-hidden="true"></span>
        </button>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-carousel')) {
  customElements.define('mp-carousel', MpCarousel);
}
