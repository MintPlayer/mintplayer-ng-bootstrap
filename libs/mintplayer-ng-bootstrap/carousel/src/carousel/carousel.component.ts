import { isPlatformServer, NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, contentChildren, DestroyRef, effect, ElementRef, forwardRef, inject, input, model, OnDestroy, output, PLATFORM_ID, signal, TemplateRef, viewChild } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsSwipeContainerDirective, BsSwipeDirective, BsSwipeViewportDirective } from '@mintplayer/ng-swiper/swiper';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsReducedMotionDirective } from '@mintplayer/ng-bootstrap/reduced-motion';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';
import type { BsCarouselPlayPauseContext } from '../carousel-play-pause/carousel-play-pause.directive';
@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  imports: [
    NgTemplateOutlet,
    BsSwipeContainerDirective,
    BsSwipeDirective,
    BsSwipeViewportDirective,
    BsNoNoscriptDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsReducedMotionDirective],
  host: {
    '[@.disabled]': 'animationsDisabled()',
  },
})
export class BsCarouselComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private readonly reducedMotion = inject(BsReducedMotionDirective);

  readonly colors = Color;
  readonly isServerSide = isPlatformServer(this.platformId);
  currentImageIndex = signal(0);
  readonly images = contentChildren<BsCarouselImageDirective>(forwardRef(() => BsCarouselImageDirective));
  resizeObserver?: ResizeObserver;
  private intervalId?: ReturnType<typeof setInterval>;
  private isDestroyed = false;

  // Inputs
  indicators = input(false);
  keyboardEvents = input(true);
  orientation = input<'horizontal' | 'vertical'>('horizontal');
  animation = input<'fade' | 'slide' | 'none'>('slide');
  interval = input<number | null>(null);
  wrap = input(true);
  ariaLabel = input<string | null>(null);

  // Two-way: pause / resume the auto-advance timer. Toggled by the
  // consumer's `*bsCarouselPlayPause` template via the `toggle` callback in
  // its context, or by the public `play()` / `pause()` methods. Default
  // false (auto-advance allowed); has no effect when `interval` is null/0.
  paused = model<boolean>(false);

  /**
   * Template projected via `*bsCarouselPlayPause`. When set, the carousel
   * renders it in a control row above the slides. Per APG, auto-advancing
   * carousels must expose a play/pause control — this is how consumers
   * provide one without us imposing a button style.
   */
  readonly playPauseTemplate = signal<TemplateRef<BsCarouselPlayPauseContext> | null>(null);

  // Outputs
  slideChange = output<number>();
  animationStart = output<void>();
  animationEnd = output<void>();

  // Computed signals
  imageCount = computed(() => this.images().length);

  readonly innerElement = viewChild<ElementRef<HTMLDivElement>>('innerElement');
  readonly swipeContainer = viewChild<BsSwipeContainerDirective>('container');

  // Returns 200 when swipeContainer isn't ready or height is null/0, ensuring images render and ResizeObserver triggers
  slideHeight = computed(() => {
    const container = this.swipeContainer();
    const height = container?.currentSlideHeight();
    return (height && height > 0) ? height : 200;
  });

  firstImageTemplate = computed<TemplateRef<any> | null>(() => {
    const images = this.images();
    if (images.length === 0) return null;

    const img = images[0];
    if (!img) return null;

    return img.itemTemplate;
  });

  lastImageTemplate = computed<TemplateRef<any> | null>(() => {
    const images = this.images();
    if (images.length === 0) return null;

    const img = images[images.length - 1];
    if (!img) return null;

    return img.itemTemplate;
  });

  readonly animationsDisabled = signal<boolean>(false);

  /**
   * `aria-live` value for the slide viewport. Stays `off` while
   * auto-advance is actually rotating — otherwise the SR would re-read the
   * active slide every interval — and switches to `polite` whenever the
   * rotation is paused (by `paused`, missing/zero `interval`, or
   * `prefers-reduced-motion`), so manual prev/next/indicator clicks get
   * announced.
   */
  readonly slideAriaLive = computed<'off' | 'polite'>(() => {
    const intervalTime = this.interval();
    if (!intervalTime || intervalTime <= 0) return 'polite';
    if (this.paused()) return 'polite';
    if (this.reducedMotion.matches()) return 'polite';
    return 'off';
  });

  constructor() {
    // Mark first image whenever images change
    effect(() => {
      const images = this.images();
      images.forEach((item, index) => item.isFirst = (index === 0));
    });

    // Setup auto-advance interval effect — gated on the two new axes added
    // by the APG carousel bundle (PRD aria-accessibility-audit §13.2):
    //   • `paused` model: lets the consumer (or the projected play/pause
    //     button) suspend rotation.
    //   • prefers-reduced-motion: suppresses auto-advance entirely when
    //     the user opts out of motion at the OS level.
    effect(() => {
      const intervalTime = this.interval();
      const isPaused = this.paused();
      const reduceMotion = this.reducedMotion.matches();
      this.clearAutoAdvance();

      if (intervalTime && intervalTime > 0 && !isPaused && !reduceMotion) {
        this.intervalId = setInterval(() => {
          this.next();
        }, intervalTime);
      }
    });

    // Emit slideChange when currentImageIndex changes
    effect(() => {
      const index = this.currentImageIndex();
      if (!this.isDestroyed) {
        this.slideChange.emit(index);
      }
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.clearAutoAdvance();
      this.resizeObserver?.disconnect();
    });
  }

  /** Resume auto-advance. No-op if `interval` is unset or reduce-motion is on. */
  play() {
    this.paused.set(false);
  }

  /** Pause auto-advance. Manual prev/next/goto still work. */
  pause() {
    this.paused.set(true);
  }

  /** Toggle the paused state. Used as the `toggle` callback in `BsCarouselPlayPauseContext`. */
  togglePaused = () => {
    this.paused.update((p) => !p);
  };

  private clearAutoAdvance() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  previous() {
    if (!this.wrap() && this.currentImageIndex() === 0) return;
    this.swipeContainer()?.previous();
  }

  next() {
    if (!this.wrap() && this.currentImageIndex() === this.imageCount() - 1) return;
    this.swipeContainer()?.next();
  }

  goto(index: number) {
    if (index < 0 || index >= this.imageCount()) return;
    this.swipeContainer()?.goto(index);
  }

  readonly imageCounter = signal<number>(1);

  ngAfterViewInit() {
    if (!this.isServerSide) {
      this.resizeObserver = new ResizeObserver(() => {
        // Signals automatically trigger change detection in zoneless mode
        // The resize will be picked up by the observe-size directive
      });
      const el = this.innerElement();
      if (el) {
        this.resizeObserver.observe(el.nativeElement);
      }
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    const innerEl = this.innerElement();
    if (innerEl) {
      this.resizeObserver?.unobserve(innerEl.nativeElement);
    }
    this.resizeObserver?.disconnect();
    this.clearAutoAdvance();
  }

  onContainerAnimationStart() {
    this.animationStart.emit();
  }

  onContainerAnimationEnd() {
    this.animationEnd.emit();
  }

  onImageIndexChange(index: number) {
    this.currentImageIndex.set(index);
  }
}
