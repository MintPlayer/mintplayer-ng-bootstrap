import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import {
  MpCarousel,
  type CarouselAnimation,
  type CarouselOrientation,
  type CarouselPausedChangeEventDetail,
  type CarouselSlideChangeEventDetail,
} from '@mintplayer/web-components/carousel';

// Side-effect import: registers the <mp-carousel> custom element.
import '@mintplayer/web-components/carousel';

/**
 * Angular wrapper for `<mp-carousel>`. Slides are projected children — any
 * element (`<img>`, `<div>`, …) becomes a slide; the web component handles
 * cloning for the seamless loop, so no per-slide directive is needed.
 *
 *     <bs-carousel [interval]="4000" [indicators]="true" [(paused)]="paused"
 *                  ariaLabel="Photos">
 *       <img src="a.jpg" /><img src="b.jpg" />
 *     </bs-carousel>
 *
 * The carousel is host-controlled: bind `[(index)]` / listen to `(slideChange)`
 * to track the active slide, and `[(paused)]` to drive auto-advance.
 */
@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCarouselComponent {
  readonly orientation = input<CarouselOrientation>('horizontal');
  readonly animation = input<CarouselAnimation>('slide');
  readonly interval = input<number | null>(null);
  readonly wrap = input<boolean>(true);
  readonly indicators = input<boolean>(false);
  readonly keyboardEvents = input<boolean>(true);
  readonly ariaLabel = input<string | null>(null);

  /** Two-way active slide index. */
  readonly index = model<number>(0);
  /** Two-way auto-advance paused state. */
  readonly paused = model<boolean>(false);

  readonly slideChange = output<number>();
  readonly animationStart = output<void>();
  readonly animationEnd = output<void>();

  private readonly elementRef = viewChild<ElementRef<MpCarousel>>('el');

  constructor() {
    this.bindProp((el) => (el.orientation = this.orientation()));
    this.bindProp((el) => (el.animation = this.animation()));
    this.bindProp((el) => (el.interval = this.interval()));
    this.bindProp((el) => (el.wrap = this.wrap()));
    this.bindProp((el) => (el.indicators = this.indicators()));
    this.bindProp((el) => (el.keyboardEvents = this.keyboardEvents()));
    this.bindProp((el) => {
      const label = this.ariaLabel();
      if (label != null) el.setAttribute('aria-label', label);
      else el.removeAttribute('aria-label');
    });
    this.bindProp((el) => (el.paused = this.paused()));
    this.bindProp((el) => {
      if (el.index !== this.index()) el.index = this.index();
    });
  }

  /** Run `apply` against the WC element whenever a tracked signal changes. */
  private bindProp(apply: (el: MpCarousel) => void): void {
    effect(() => {
      const el = this.elementRef()?.nativeElement;
      if (el) apply(el);
    });
  }

  protected onSlideChange(event: Event): void {
    const detail = (event as CustomEvent<CarouselSlideChangeEventDetail>).detail;
    this.index.set(detail.index);
    this.slideChange.emit(detail.index);
  }

  protected onPausedChange(event: Event): void {
    const detail = (event as CustomEvent<CarouselPausedChangeEventDetail>).detail;
    this.paused.set(detail.paused);
  }

  // ---- imperative API (delegates to the WC) --------------------------------
  play(): void { this.elementRef()?.nativeElement.play(); }
  pause(): void { this.elementRef()?.nativeElement.pause(); }
  previous(): void { this.elementRef()?.nativeElement.previous(); }
  next(): void { this.elementRef()?.nativeElement.next(); }
  goto(index: number): void { this.elementRef()?.nativeElement.goto(index); }
}
