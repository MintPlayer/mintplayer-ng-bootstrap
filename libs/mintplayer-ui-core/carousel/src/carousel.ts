import type { CoreBag } from '@mintplayer/ui-core/component';
import { defineContext } from '@mintplayer/ui-core/component';
import { hydratedAttr } from '@mintplayer/ui-core/store';

/**
 * The carousel (#437): a deck of slides, one shown at a time.
 *
 * The checked radio is the index store in both tiers. With JS off the radios,
 * their labels (indicators, prev/next) and the stylesheet's `:checked` rules are
 * the whole machine; once live the core moves the same radio and animates the
 * two slides in motion. The slides are grid-stacked, so the deck is as tall as
 * its tallest slide on the server already: nothing is measured.
 *
 * The slides are the consumer's carousel items. The template cannot count them
 * on the server, so each front reports `slideCount` (the Angular, React and Vue
 * extensions count their declarative children); once live the core counts the
 * track's children itself.
 */
export const CAROUSEL_SCOPE = 'carousel';

export type CarouselBag = CoreBag;
export type CarouselAnimation = 'slide' | 'fade' | 'none';
export type CarouselOrientation = 'horizontal' | 'vertical';

export interface CarouselSlideChangeEventDetail {
  index: number;
}

/** Accessible names. `${n}` is a 1-based slide number, `${count}` the deck size. */
export interface CarouselLabels {
  /** The region's role description. */
  carousel: string;
  /** Each slide's role description. */
  slide: string;
  /** A slide's name, written once live. */
  position: string;
  /** An indicator and its radio. */
  goTo: string;
  previous: string;
  next: string;
  play: string;
  pause: string;
}

export const CAROUSEL_LABELS: CarouselLabels = {
  carousel: 'carousel',
  slide: 'slide',
  position: '${n} of ${count}',
  goTo: 'Slide ${n}',
  previous: 'Previous',
  next: 'Next',
  play: 'Start automatic slide show',
  pause: 'Stop automatic slide show',
};

export const carouselLabel = (template: string, vars: Record<string, number>): string =>
  template.replace(/\$\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));

/** What a carousel hands its items. */
export interface CarouselItemsContext {
  readonly labels: CarouselLabels;
}

export const CAROUSEL_ITEMS = defineContext<CarouselItemsContext>('carousel-items', { labels: CAROUSEL_LABELS });

const scoped = (bag: CarouselBag): CarouselBag => ({ ...bag, 'data-mps': CAROUSEL_SCOPE });

export interface CarouselOptions {
  /** Deterministic id: radio ids and the radio group's name derive from it. */
  readonly id: string;
  readonly count: number;
  readonly index: number;
  readonly animation: CarouselAnimation;
  readonly orientation: CarouselOrientation;
  readonly indicators: boolean;
  readonly keyboardEvents: boolean;
  /** Autoplay period in ms; 0 is off. */
  readonly interval: number;
  readonly paused: boolean;
  readonly reducedMotion: boolean;
  readonly animating: boolean;
  readonly hydrated: boolean;
  readonly label: string | null;
  readonly labels: CarouselLabels;
}

export interface CarouselKeyed {
  key: number;
  bag: CarouselBag;
}

export interface CarouselControlPair {
  key: number;
  pair: CarouselBag;
  prev: CarouselBag;
  next: CarouselBag;
}

export interface CarouselView {
  root: CarouselBag;
  /** The default play/pause button: live and with an interval only. */
  playPause: { wrap: CarouselBag; button: CarouselBag; icon: CarouselBag } | null;
  radios: CarouselKeyed[];
  inner: CarouselBag;
  track: CarouselBag;
  indicators: { bag: CarouselBag; items: CarouselKeyed[] } | null;
  controls: { bag: CarouselBag; pairs: CarouselControlPair[]; icon: { prev: CarouselBag; next: CarouselBag } };
}

export const carouselRadioId = (id: string, index: number): string => `${id}-s${index}`;

export const parseAnimation = (value: unknown): CarouselAnimation => (value === 'fade' || value === 'none' ? value : 'slide');
export const parseOrientation = (value: unknown): CarouselOrientation => (value === 'vertical' ? 'vertical' : 'horizontal');

/**
 * `polite` announces manual navigation; `off` keeps a rotating deck from
 * talking over the user. Rotation only happens with an interval, unpaused, and
 * motion allowed.
 */
const ariaLive = (o: CarouselOptions): 'off' | 'polite' => (o.interval > 0 && !o.paused && !o.reducedMotion ? 'off' : 'polite');

export function connectCarousel(o: CarouselOptions): CarouselView {
  const n = Math.max(0, o.count);
  const live = o.hydrated;
  const slides = Array.from({ length: n }, (_, i) => i);
  const radio = (i: number) => carouselRadioId(o.id, ((i % n) + n) % n);
  return {
    root: scoped({
      class: 'carousel',
      role: 'region',
      'aria-roledescription': o.labels.carousel,
      'aria-label': o.label,
      'data-animation': o.animation,
      'data-orientation': o.orientation,
      ...hydratedAttr(live),
    }),
    playPause:
      live && o.interval > 0
        ? {
            wrap: scoped({ class: 'carousel-play-pause' }),
            button: scoped({
              type: 'button',
              class: `carousel-play-pause-btn ${o.paused ? 'carousel-play-pause-paused' : 'carousel-play-pause-playing'}`,
              'aria-pressed': String(o.paused),
              'aria-label': o.paused ? o.labels.play : o.labels.pause,
              'data-carousel-toggle': '',
            }),
            icon: scoped({ class: 'carousel-play-pause-icon', 'aria-hidden': 'true' }),
          }
        : null,
    radios: slides.map((i) => ({
      key: i,
      bag: scoped({
        type: 'radio',
        id: radio(i),
        name: o.id,
        class: 'car-radio visually-hidden',
        'aria-label': carouselLabel(o.labels.goTo, { n: i + 1, count: n }),
        checked: i === o.index,
      }),
    })),
    inner: scoped({
      class: 'carousel-inner',
      tabindex: live ? 0 : null,
      'aria-live': live ? ariaLive(o) : null,
      'aria-atomic': live ? 'false' : null,
      'aria-busy': live && o.animating ? 'true' : null,
      'aria-keyshortcuts':
        live && o.keyboardEvents ? (o.orientation === 'horizontal' ? 'ArrowLeft ArrowRight Home End' : 'ArrowUp ArrowDown Home End') : null,
    }),
    track: scoped({ class: 'carousel-track' }),
    indicators: o.indicators
      ? {
          bag: scoped({ class: 'carousel-indicators' }),
          items: slides.map((i) => ({
            key: i,
            bag: scoped({
              for: radio(i),
              'data-bs-target': '',
              'data-index': i,
              'aria-label': carouselLabel(o.labels.goTo, { n: i + 1, count: n }),
              'aria-current': live && i === o.index ? 'true' : null,
            }),
          })),
        }
      : null,
    controls: {
      bag: scoped({ class: 'carousel-controls' }),
      // One pair per slide; the stylesheet shows the checked slide's pair. The
      // labels' targets wrap, which is what navigates with JS off.
      pairs: slides.map((i) => ({
        key: i,
        pair: scoped({ class: 'carousel-control-pair' }),
        prev: scoped({
          class: 'carousel-control-prev',
          for: radio(i - 1),
          role: 'button',
          tabindex: live ? 0 : null,
          'data-step': 'previous',
          'aria-label': o.labels.previous,
        }),
        next: scoped({
          class: 'carousel-control-next',
          for: radio(i + 1),
          role: 'button',
          tabindex: live ? 0 : null,
          'data-step': 'next',
          'aria-label': o.labels.next,
        }),
      })),
      icon: {
        prev: scoped({ class: 'carousel-control-prev-icon', 'aria-hidden': 'true' }),
        next: scoped({ class: 'carousel-control-next-icon', 'aria-hidden': 'true' }),
      },
    },
  };
}

export interface CarouselItemView {
  root: CarouselBag;
}

/** A slide. Its position name ("2 of 5") is written once live: only the deck knows its index. */
export function connectCarouselItem(context: CarouselItemsContext): CarouselItemView {
  return {
    root: scoped({ class: 'carousel-item', role: 'group', 'aria-roledescription': context.labels.slide }),
  };
}
