import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { IndexMachine, PointerArbiter, keyToIntent, type TransitionHandle } from '@mintplayer/ui-core/swiper-core';
import {
  CAROUSEL_ITEMS,
  CAROUSEL_LABELS,
  carouselLabel,
  connectCarousel,
  connectCarouselItem,
  parseAnimation,
  parseOrientation,
  type CarouselAnimation,
  type CarouselItemView,
  type CarouselItemsContext,
  type CarouselLabels,
  type CarouselOrientation,
  type CarouselSlideChangeEventDetail,
  type CarouselView,
} from './carousel';

/**
 * The carousel's cores (PRD #437 D10): what the generated Angular, React, Vue
 * and Lit components host. `carousel.component.ts` is the manifest and
 * `templates/` the markup.
 *
 * Once live, a swiper-core IndexMachine owns the index and a PointerArbiter the
 * touch drag. Motion is applied to the slides themselves, never to a track: a
 * slide in flight gets `data-moving` (which keeps it visible) and a transient
 * `translate`, so a wrap from the last slide to the first needs no clone cell
 * and no consumer node ever moves in the DOM.
 */
export interface CarouselInputs {
  animation: CarouselAnimation;
  orientation: CarouselOrientation;
  indicators: boolean;
  /** Autoplay period in ms; null or 0 is off. */
  interval?: number | null;
  wrap: boolean;
  keyboardEvents: boolean;
  /** Autoplay paused. Two-way. */
  paused: boolean;
  /** The region's accessible name; an `aria-label` on the component wins. */
  inputLabel?: string | null;
  labels?: Partial<CarouselLabels> | null;
  /** The number of items, as the front counted its children for the server render. */
  slideCount?: number | null;
}

export interface CarouselState {
  index: number;
  paused: boolean;
  /** The track's item count once live (null before). */
  count: number | null;
  animating: boolean;
  reducedMotion: boolean;
}

export interface CarouselEvents {
  slideChange: CarouselSlideChangeEventDetail;
  pausedChange: boolean;
  animationStart: void;
  animationEnd: void;
}

export interface CarouselMethods {
  /** Go to the previous slide (wrapping when `wrap`). */
  previous(): void;
  /** Go to the next slide (wrapping when `wrap`). */
  next(): void;
  /** Go to a slide by index; `animate: false` jumps. */
  goto(index: number, options?: { animate?: boolean }): void;
  /** Resume autoplay. */
  play(): void;
  /** Pause autoplay. */
  pause(): void;
  /** Toggle autoplay. */
  togglePaused(): void;
}

type Api = CoreApi<CarouselInputs, CarouselState, CarouselEvents>;

const labelsOf = (inputs: Readonly<CarouselInputs>): CarouselLabels => ({ ...CAROUSEL_LABELS, ...inputs.labels });
const intervalOf = (inputs: Readonly<CarouselInputs>): number => {
  const ms = Number(inputs.interval);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
};
const durationOf = (inputs: Readonly<CarouselInputs>): number => (parseAnimation(inputs.animation) === 'none' ? 0 : 500);

/** The live parts of one carousel, for its methods. */
interface Engine {
  readonly machine: IndexMachine;
  setPaused(paused: boolean): void;
  inputsChanged(prev: Readonly<CarouselInputs>): void;
}
const engines = new WeakMap<HTMLElement, Engine>();

/** A slide's offset from `ratio` in slide units, the short way round when wrapping. */
function offsetOf(k: number, ratio: number, n: number, wrap: boolean): number {
  const d = k - ratio;
  if (!wrap || n < 2) return d;
  const m = ((d % n) + n) % n;
  return m > n / 2 ? m - n : m;
}

const wrapIndex = (raw: number, n: number): number => (n > 0 ? ((Math.round(raw) % n) + n) % n : 0);

function translateFor(orientation: CarouselOrientation, offset: number): string {
  return orientation === 'horizontal' ? `${offset * 100}% 0` : `0 ${offset * 100}%`;
}

function clearMotion(el: HTMLElement): void {
  el.removeAttribute('data-moving');
  el.style.removeProperty('translate');
  el.style.removeProperty('opacity');
}

export const carouselCore = defineCore<
  CarouselInputs,
  CarouselState,
  { view: CarouselView },
  CarouselEvents,
  undefined,
  CarouselItemsContext,
  CarouselMethods
>({
  provides: CAROUSEL_ITEMS,
  state: (inputs) => ({ index: 0, paused: !!inputs.paused, count: null, animating: false, reducedMotion: false }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectCarousel({
      id,
      count: state.count ?? inputs.slideCount ?? 0,
      index: state.index,
      animation: parseAnimation(inputs.animation),
      orientation: parseOrientation(inputs.orientation),
      indicators: !!inputs.indicators,
      keyboardEvents: inputs.keyboardEvents !== false,
      interval: intervalOf(inputs),
      paused: state.paused,
      reducedMotion: state.reducedMotion,
      animating: state.animating,
      hydrated,
      label: label ?? inputs.inputLabel ?? null,
      labels: labelsOf(inputs),
    }),
  }),
  provide: ({ inputs }) => ({ labels: labelsOf(inputs) }),
  attach: (api) => {
    const root = api.host;
    const inputs = () => api.inputs();
    const orientation = () => parseOrientation(inputs().orientation);
    const animation = () => parseAnimation(inputs().animation);
    const wrap = () => inputs().wrap !== false;
    /** Our own node, not one of a nested carousel's. */
    const own = (el: Element | null): el is HTMLElement => !!el && el.closest('.carousel') === root;
    const inner = () => root.querySelector<HTMLElement>(':scope > .carousel-inner');
    const track = () => inner()?.querySelector<HTMLElement>(':scope > .carousel-track') ?? null;
    // Every element in the track is a slide: an item front may not have stamped
    // its own class yet when the deck attaches (Lit updates the children later).
    const items = () => [...(track()?.children ?? [])] as HTMLElement[];
    const radios = () => [...root.querySelectorAll<HTMLInputElement>(':scope > .car-radio')];
    const reduced = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;

    /** The parts no bag can carry: each slide's position name and the active flag past the stylesheet's range. */
    const markSlides = (index: number) => {
      const list = items();
      const labels = labelsOf(inputs());
      list.forEach((el, k) => {
        el.setAttribute('aria-label', carouselLabel(labels.position, { n: k + 1, count: list.length }));
        el.toggleAttribute('data-active', k === index);
      });
    };

    const applyRatio = (ratio: number) => {
      const list = items();
      if (animation() !== 'slide' || Number.isInteger(ratio)) {
        list.forEach(clearMotion);
        return;
      }
      // A live drag: the slides within one slide of the finger follow it.
      list.forEach((el, k) => {
        const d = offsetOf(k, ratio, list.length, wrap());
        if (Math.abs(d) < 1) {
          el.setAttribute('data-moving', '');
          el.style.setProperty('translate', translateFor(orientation(), d));
        } else {
          clearMotion(el);
        }
      });
    };

    const runTransition = (from: number, to: number, duration: number, done: () => void): TransitionHandle => {
      const list = items();
      const n = list.length;
      const target = wrapIndex(to, n);
      const outgoing = machine.getIndex();
      // The target lands at 0 coming from (to - from); every other slide keeps
      // its offset from `from` and travels the same distance.
      const moving = list
        .map((el, k) => {
          const a = k === target ? to - from : offsetOf(k, from, n, wrap());
          return { el, k, a, b: k === target ? 0 : a - (to - from) };
        })
        .filter((m) => (animation() === 'fade' ? m.k === target || m.k === outgoing : Math.abs(m.a) < 1 || Math.abs(m.b) < 1));
      const animations: Animation[] = [];
      let settled = false;
      const settle = (finish: boolean) => {
        if (settled) return;
        settled = true;
        // Commit first: the checked radio shows the new slide in the same task
        // the in-flight styles are dropped, so no frame paints between them.
        if (finish) done();
        animations.forEach((a) => a.cancel());
        moving.forEach((m) => clearMotion(m.el));
      };
      moving.forEach((m) => m.el.setAttribute('data-moving', ''));
      const canAnimate = moving.every((m) => typeof m.el.animate === 'function');
      if (!canAnimate) {
        // No Web Animations (jsdom): settle at once.
        settle(true);
        return { finish: () => undefined, cancel: () => undefined };
      }
      moving.forEach((m) => {
        const keyframes =
          animation() === 'fade'
            ? [{ opacity: m.k === target ? 0 : 1 }, { opacity: m.k === target ? 1 : 0 }]
            : [{ translate: translateFor(orientation(), m.a) }, { translate: translateFor(orientation(), m.b) }];
        animations.push(m.el.animate(keyframes, { duration, easing: 'ease', fill: 'forwards' }));
      });
      animations[0].onfinish = () => settle(true);
      return { finish: () => settle(true), cancel: () => settle(false) };
    };

    const machine: IndexMachine = new IndexMachine(
      { applyOffsetRatio: applyRatio, runTransition },
      {
        onIndexChange: (index) => {
          // The radio stays the index store: the stylesheet reads :checked.
          // Setting .checked fires no change event, so this cannot loop.
          const radio = radios()[index];
          if (radio) radio.checked = true;
          markSlides(index);
          api.setState({ index });
          api.emit('slideChange', { index });
        },
        onAnimationStart: () => {
          api.setState({ animating: true });
          api.emit('animationStart', undefined);
        },
        onAnimationEnd: () => {
          api.setState({ animating: false });
          api.emit('animationEnd', undefined);
        },
      },
      {
        count: items().length,
        wrap: wrap(),
        durationMs: durationOf(inputs()),
        minimumOffsetPx: 50,
        prefersReducedMotion: () => reduced?.matches ?? false,
      },
    );

    const arbiter = new PointerArbiter(
      { orientation: orientation() },
      {
        onDragStart: () => machine.beginDrag(),
        onDragMove: (delta) => machine.dragBy(delta, extent()),
        onDragEnd: (delta) => machine.endDrag(delta, extent()),
      },
    );
    const extent = () => {
      const box = inner();
      return (orientation() === 'horizontal' ? box?.clientWidth : box?.clientHeight) ?? 0;
    };

    // ---- autoplay: paused, or suspended while hovered or focused (WCAG 2.2.2) ----
    let timer: ReturnType<typeof setInterval> | null = null;
    let hovered = false;
    let focused = false;
    const syncAutoplay = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
      const ms = intervalOf(inputs());
      if (ms > 0 && !api.state().paused && !hovered && !focused && !(reduced?.matches ?? false)) {
        timer = setInterval(() => machine.next(), ms);
      }
    };
    const setPaused = (paused: boolean) => {
      if (paused === api.state().paused) return;
      api.setState({ paused });
      api.emit('pausedChange', paused);
      syncAutoplay();
    };

    // ---- the deck: count, labels, a start index a no-JS user navigated to ----
    const syncCount = () => {
      const n = items().length;
      machine.setConfig({ count: n });
      if (api.state().count !== n) api.setState({ count: n });
      markSlides(machine.getIndex());
    };
    const observer = new MutationObserver(syncCount);
    const trackEl = track();
    if (trackEl) observer.observe(trackEl, { childList: true });
    syncCount();
    const checked = radios().findIndex((r) => r.checked);
    if (checked > 0 && checked < items().length) machine.goto(checked, { animate: false });
    api.setState({ reducedMotion: reduced?.matches ?? false });

    // ---- input ----
    const onClick = (ev: MouseEvent) => {
      const hit = (ev.target as Element | null)?.closest?.('[data-index], [data-step], [data-carousel-toggle]') ?? null;
      if (!own(hit)) return;
      if (hit.hasAttribute('data-carousel-toggle')) {
        setPaused(!api.state().paused);
        return;
      }
      // A label would flip its radio; the machine owns the move (and its wrap direction).
      ev.preventDefault();
      if (hit.dataset['step'] === 'previous') machine.previous();
      else if (hit.dataset['step'] === 'next') machine.next();
      else machine.goto(Number(hit.dataset['index']));
    };
    const onKeydown = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!own(target)) return;
      if (target.dataset['step'] && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        if (target.dataset['step'] === 'previous') machine.previous();
        else machine.next();
        return;
      }
      // APG: only keys pressed on the viewport itself navigate; focusable slide
      // content (or a nested carousel) keeps its own keys.
      if (target !== inner() || inputs().keyboardEvents === false) return;
      const intent = keyToIntent(ev.key, orientation());
      if (!intent) return;
      ev.preventDefault();
      machine.intent(intent);
    };
    const onChange = (ev: Event) => {
      const target = ev.target as HTMLInputElement;
      if (!own(target) || !target.classList.contains('car-radio')) return;
      const index = radios().indexOf(target);
      if (index >= 0 && index !== machine.getIndex()) machine.goto(index);
    };
    const onPointerEnter = () => {
      hovered = true;
      syncAutoplay();
    };
    const onPointerLeave = () => {
      hovered = false;
      syncAutoplay();
    };
    const onFocusIn = () => {
      focused = true;
      syncAutoplay();
    };
    const onFocusOut = (ev: FocusEvent) => {
      if (ev.relatedTarget instanceof Node && root.contains(ev.relatedTarget)) return;
      focused = false;
      syncAutoplay();
    };
    const onReducedMotion = () => {
      api.setState({ reducedMotion: reduced?.matches ?? false });
      syncAutoplay();
    };

    // Touch: manual, non-passive listeners. Frameworks register touch listeners
    // passively, which ignores the preventDefault the pull-to-refresh defence needs.
    const onTouchStart = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return;
      arbiter.pointerDown(ev.touches[0].clientX, ev.touches[0].clientY);
    };
    const onTouchMove = (ev: TouchEvent) => {
      const touch = ev.touches[0];
      if (!touch || !arbiter.pointerMove(touch.clientX, touch.clientY)) return;
      // Locked onto our axis: no native scroll, and an outer carousel stays still.
      ev.preventDefault();
      ev.stopPropagation();
    };
    const onTouchEnd = (ev: TouchEvent) => {
      if (!arbiter.pointerUp()) return;
      ev.preventDefault();
      ev.stopPropagation();
    };
    const onTouchCancel = () => {
      arbiter.abort();
      machine.goto(machine.getIndex(), { animate: false });
    };

    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);
    root.addEventListener('change', onChange);
    root.addEventListener('pointerenter', onPointerEnter);
    root.addEventListener('pointerleave', onPointerLeave);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    reduced?.addEventListener?.('change', onReducedMotion);
    trackEl?.addEventListener('touchstart', onTouchStart, { passive: true });
    trackEl?.addEventListener('touchmove', onTouchMove, { passive: false });
    trackEl?.addEventListener('touchend', onTouchEnd, { passive: false });
    trackEl?.addEventListener('touchcancel', onTouchCancel, { passive: true });
    const inputsChanged = (prev: Readonly<CarouselInputs>) => {
      const now = inputs();
      if (now.wrap !== prev.wrap) machine.setConfig({ wrap: wrap() });
      if (now.animation !== prev.animation) {
        machine.interrupt();
        machine.setConfig({ durationMs: durationOf(now) });
      }
      if (now.orientation !== prev.orientation) {
        machine.interrupt();
        arbiter.setOrientation(orientation());
      }
      if (now.paused !== prev.paused && !!now.paused !== api.state().paused) api.setState({ paused: !!now.paused });
      syncAutoplay();
    };
    engines.set(root, { machine, setPaused, inputsChanged });
    syncAutoplay();

    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
      root.removeEventListener('change', onChange);
      root.removeEventListener('pointerenter', onPointerEnter);
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      reduced?.removeEventListener?.('change', onReducedMotion);
      trackEl?.removeEventListener('touchstart', onTouchStart);
      trackEl?.removeEventListener('touchmove', onTouchMove);
      trackEl?.removeEventListener('touchend', onTouchEnd);
      trackEl?.removeEventListener('touchcancel', onTouchCancel);
      observer.disconnect();
      if (timer !== null) clearInterval(timer);
      arbiter.destroy();
      machine.destroy();
      items().forEach(clearMotion);
      engines.delete(root);
    };
  },
  inputsChanged: (api, prev) => engines.get(api.host)?.inputsChanged(prev),
  methods: {
    previous: (api) => engines.get(api.host)?.machine.previous(),
    next: (api) => engines.get(api.host)?.machine.next(),
    goto: (api, index, options) => engines.get(api.host)?.machine.goto(index, options ?? {}),
    play: (api) => engines.get(api.host)?.setPaused(false),
    pause: (api) => engines.get(api.host)?.setPaused(true),
    togglePaused: (api) => engines.get(api.host)?.setPaused(!api.state().paused),
  },
});

export const carouselItemCore = defineCore<object, object, { view: CarouselItemView }, Record<never, never>, CarouselItemsContext>({
  consume: CAROUSEL_ITEMS,
  view: ({ context }) => ({ view: connectCarouselItem(context) }),
});
