import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type {
  CarouselAnimation,
  CarouselOrientation,
  CarouselPausedChangeEventDetail,
  CarouselSlideChangeEventDetail,
  MpCarousel,
} from '@mintplayer/web-components/carousel';

/**
 * `<bs-carousel>` — Angular wrapper around the `<mp-carousel>` web component.
 *
 * Slides are plain content children (no structural directive):
 *
 *     <bs-carousel animation="fade" [indicators]="true" [interval]="4000" ariaLabel="Photos">
 *       <img src="a.png" alt="…">
 *       <img src="b.png" alt="…">
 *     </bs-carousel>
 *
 * Track layout, gestures, keyboard, ARIA, the radio-driven no-JS tier and the
 * height contract all live in the WC (single source of UI truth); this wrapper
 * only bridges inputs to attributes and re-emits the WC's typed events. A
 * custom play/pause control can be projected with `slot="play-pause"` — wire
 * it to `togglePaused()` (or listen to `pausedChange`).
 *
 * The WC is registered **client-side only** (`afterNextRender`); on the server
 * Angular emits a bare `<mp-carousel>` tag and the SSR layer injects its
 * Declarative Shadow DOM (see `injectMpCarouselDsd`), so the carousel renders
 * — and navigates — with JS off.
 */
@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsCarouselComponent {
  /** Slide transition: `slide` (default), `fade`, or `none`. */
  readonly animation = input<CarouselAnimation>('slide');
  /** Slide axis; vertical also pins every slide to the tallest one. */
  readonly orientation = input<CarouselOrientation>('horizontal');
  /** Show the indicator dots. */
  readonly indicators = input(false);
  /** Auto-advance interval in ms; `null`/`0` disables autoplay. */
  readonly interval = input<number | null>(null);
  /** Wrap around at the ends (buttons, keyboard AND swipe). */
  readonly wrap = input(true);
  /** Arrow/Home/End navigation on the focused viewport. */
  readonly keyboardEvents = input(true);
  /** Accessible label for the carousel region. */
  readonly ariaLabel = input<string | null>(null);
  /** Two-way: whether autoplay is paused. */
  readonly paused = model(false);

  /** The committed slide index changed. */
  readonly slideChange = output<number>();
  readonly animationStart = output<void>();
  readonly animationEnd = output<void>();

  protected readonly element = viewChild<ElementRef<MpCarousel>>('element');

  /** Presence/string-or-absent attributes derived once via signals. */
  protected readonly indicatorsAttr = computed(() => (this.indicators() ? '' : null));
  protected readonly intervalAttr = computed(() => {
    const value = this.interval();
    return value && value > 0 ? String(value) : null;
  });
  protected readonly wrapAttr = computed(() => (this.wrap() ? null : 'false'));
  protected readonly keyboardEventsAttr = computed(() => (this.keyboardEvents() ? null : 'false'));
  protected readonly pausedAttr = computed(() => (this.paused() ? '' : null));

  constructor() {
    afterNextRender(() => {
      // Side-effect import registers <mp-carousel>; client-only so SSR stays
      // a bare tag for DSD injection.
      import('@mintplayer/web-components/carousel');
    });
  }

  previous(): void {
    this.element()?.nativeElement.previous?.();
  }

  next(): void {
    this.element()?.nativeElement.next?.();
  }

  goto(index: number): void {
    this.element()?.nativeElement.goto?.(index);
  }

  play(): void {
    this.paused.set(false);
  }

  pause(): void {
    this.paused.set(true);
  }

  togglePaused = (): void => {
    this.paused.set(!this.paused());
  };

  protected onSlideChange(event: Event) {
    // stopPropagation so the composed WC event doesn't ALSO fire the
    // consumer's binding on the <bs-carousel> host with the raw CustomEvent.
    event.stopPropagation();
    this.slideChange.emit((event as CustomEvent<CarouselSlideChangeEventDetail>).detail.index);
  }

  protected onPausedChange(event: Event) {
    event.stopPropagation();
    this.paused.set((event as CustomEvent<CarouselPausedChangeEventDetail>).detail.paused);
  }

  protected onAnimationStart(event: Event) {
    event.stopPropagation();
    this.animationStart.emit();
  }

  protected onAnimationEnd(event: Event) {
    event.stopPropagation();
    this.animationEnd.emit();
  }
}
