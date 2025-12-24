import { DOCUMENT } from '@angular/common';
import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { AfterViewInit, computed, ContentChildren, Directive, effect, ElementRef, forwardRef, HostBinding, inject, Input, input, output, QueryList, signal } from '@angular/core';
import { BsObserveSizeDirective, Size } from '@mintplayer/ng-swiper/observe-size';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { BsSwipeDirective } from '../swipe/swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  exportAs: 'bsSwipeContainer',
  standalone: true,
  hostDirectives: [BsObserveSizeDirective],
})
export class BsSwipeContainerDirective implements AfterViewInit {
  private animationBuilder = inject(AnimationBuilder);
  private observeSize = inject(BsObserveSizeDirective);
  containerElement = inject(ElementRef<HTMLDivElement>);
  document = inject(DOCUMENT) as Document;

  @HostBinding('style.margin-left.%') offsetLeft: number | null = null;
  @HostBinding('style.margin-right.%') offsetRight: number | null = null;
  @HostBinding('style.margin-top.px') offsetTopPx: number | null = null;
  @HostBinding('style.margin-bottom.px') offsetBottomPx: number | null = null;

  @ContentChildren(forwardRef(() => BsSwipeDirective)) set swipes(value: QueryList<BsSwipeDirective>) {
    setTimeout(() => this.swipes$.set(value));
  }

  minimumOffset = input(50);
  animation$ = signal<'slide' | 'fade' | 'none'>('slide');
  orientation$ = signal<'horizontal' | 'vertical'>('horizontal');
  imageIndex$ = signal<number>(0);
  imageIndexChange = output<number>();
  animationStart = output<void>();
  animationEnd = output<void>();

  // Input setters to update internal signals
  @Input() set orientation(value: 'horizontal' | 'vertical') {
    this.orientation$.set(value);
  }

  @Input() set imageIndex(value: number) {
    this.imageIndex$.set(value);
  }

  @Input() set animation(value: 'slide' | 'fade' | 'none') {
    this.animation$.set(value);
  }

  isViewInited$ = signal<boolean>(false);
  isAnimating$ = signal<boolean>(false);
  startTouch$ = signal<StartTouch | null>(null);
  lastTouch$ = signal<LastTouch | null>(null);
  swipes$ = signal<QueryList<BsSwipeDirective> | null>(null);
  pendingAnimation?: AnimationPlayer;

  // Computed signals for derived state
  offset$ = computed(() => {
    const startTouch = this.startTouch$();
    const lastTouch = this.lastTouch$();
    const imageIndex = this.imageIndex$();
    const isViewInited = this.isViewInited$();
    const orientation = this.orientation$();
    const containerSize = this.observeSize.size$();
    const maxSlideHeight = this.maxSlideHeight$();

    if (!isViewInited) {
      return (-imageIndex * 100);
    } else if (!!startTouch && !!lastTouch) {
      // For horizontal: use container width
      // For vertical: use maxSlideHeight (single slide height, not total container height)
      const containerLength = orientation === 'horizontal'
        ? (containerSize?.width ?? this.containerElement.nativeElement.clientWidth)
        : maxSlideHeight;
      if (containerLength === 0) {
        return (-imageIndex * 100);
      }
      const delta = orientation === 'horizontal'
        ? (lastTouch.position.x - startTouch.position.x)
        : (lastTouch.position.y - startTouch.position.y);
      return (-imageIndex * 100 + (delta / containerLength) * 100);
    } else {
      return (-imageIndex * 100);
    }
  });

  padLeft$ = computed(() => {
    const swipes = this.swipes$();
    if (!swipes) return 0;

    let count = 0;
    for (const s of swipes) {
      if (!s.offside()) {
        break;
      } else {
        count++;
      }
    }
    return count;
  });

  padRight$ = computed(() => {
    const swipes = this.swipes$();
    if (!swipes) return 0;

    let count = 0;
    for (const s of swipes.toArray().reverse()) {
      if (!s.offside()) {
        break;
      } else {
        count++;
      }
    }
    return count;
  });

  offsetPrimary$ = computed(() => this.offset$() - this.padLeft$() * 100);
  offsetSecondary$ = computed(() => -(this.offset$() - this.padLeft$() * 100) - (this.padRight$() - 1) * 100);

  actualSwipes$ = computed(() => {
    const swipes = this.swipes$();
    if (swipes) {
      return swipes.filter(swipe => !swipe.offside());
    } else {
      return [];
    }
  });

  // Computed signal that reactively tracks all swipe sizes
  private slideSizes$ = computed(() => {
    const actualSwipes = this.actualSwipes$();
    if (!actualSwipes || actualSwipes.length === 0) {
      return [];
    }
    // Reading each swipe's size$() creates reactive dependencies
    return actualSwipes.map(swipe => swipe.observeSize.size$());
  });

  maxSlideHeight$ = computed(() => {
    const slideSizes = this.slideSizes$();
    const heights = slideSizes.map(s => s?.height ?? 1);
    return heights.length ? Math.max(...heights) : 1;
  });

  currentSlideHeight$ = computed<number | null>(() => {
    const slideSizes = this.slideSizes$();
    const imageIndex = this.imageIndex$();
    const orientation = this.orientation$();
    const heights = slideSizes.map(s => s?.height ?? 0);
    const maxHeight = heights.length ? Math.max(...heights) : 0;
    const currHeight: number = slideSizes[imageIndex]?.height ?? maxHeight;
    const result = (orientation === 'vertical') ? maxHeight : currHeight;
    // Return null if measurements aren't valid yet to avoid collapsing the carousel
    return result > 10 ? result : null;
  });

  private previousOrientation: 'horizontal' | 'vertical' | undefined;

  constructor() {
    // Effect to update offsetLeft/offsetTopPx based on offsetPrimary and orientation
    effect(() => {
      const offsetPrimary = this.offsetPrimary$();
      const orientation = this.orientation$();
      const maxSlideHeight = this.maxSlideHeight$();
      const isAnimating = this.isAnimating$();

      // Skip updating offsets during animation to avoid interfering with CSS animation
      if (isAnimating) {
        return;
      }

      if (orientation === 'horizontal') {
        this.offsetLeft = offsetPrimary;
        this.offsetTopPx = null;
      } else {
        // For vertical mode, convert percentage to pixels using slide height
        // offsetPrimary is in percentage units (e.g., -100 means -100%)
        // We need to convert to pixels based on actual slide height
        this.offsetTopPx = (offsetPrimary / 100) * maxSlideHeight;
        this.offsetLeft = null;
      }
    });

    // Effect to update offsetRight/offsetBottomPx based on offsetSecondary and orientation
    effect(() => {
      const offsetSecondary = this.offsetSecondary$();
      const orientation = this.orientation$();
      const maxSlideHeight = this.maxSlideHeight$();
      const isAnimating = this.isAnimating$();

      // Skip updating offsets during animation to avoid interfering with CSS animation
      if (isAnimating) {
        return;
      }

      if (orientation === 'horizontal') {
        this.offsetRight = offsetSecondary;
        this.offsetBottomPx = null;
      } else {
        // For vertical mode, convert percentage to pixels using slide height
        this.offsetBottomPx = (offsetSecondary / 100) * maxSlideHeight;
        this.offsetRight = null;
      }
    });

    // Effect to emit imageIndexChange
    effect(() => {
      const imageIndex = this.imageIndex$();
      this.imageIndexChange.emit(imageIndex);
    });

    // Effect to reset offsets when orientation changes
    effect(() => {
      const orientation = this.orientation$();
      if (this.previousOrientation !== undefined && this.previousOrientation !== orientation) {
        this.offsetLeft = null;
        this.offsetRight = null;
        this.offsetTopPx = null;
        this.offsetBottomPx = null;
      }
      this.previousOrientation = orientation;
    });
  }

  ngAfterViewInit() {
    this.isViewInited$.set(true);
  }

  animateToIndexByDx(distance: number) {
    const imageIndex = this.imageIndex$();
    const actualSwipes = this.actualSwipes$();

    let newIndex: number;
    if (Math.abs(distance) < this.minimumOffset()) {
      newIndex = imageIndex;
    } else {
      newIndex = imageIndex + (distance < 0 ? 1 : -1);
    }

    this.animateToIndex(imageIndex, newIndex, distance, actualSwipes?.length ?? 1);
  }

  animateToIndex(oldIndex: number, newIndex: number, distance: number, totalSlides: number) {
    const animation = this.animation$();
    const orientation = this.orientation$();
    const containerElement = this.containerElement.nativeElement;
    const maxSlideHeight = this.maxSlideHeight$();
    // For vertical mode, use maxSlideHeight instead of container height
    const containerLength = orientation === 'horizontal'
      ? containerElement.clientWidth
      : maxSlideHeight;

    this.animationStart.emit();

    // Handle 'none' animation mode - instant transition
    if (animation === 'none') {
      // Correct the image index immediately
      if (newIndex === -1) {
        this.imageIndex$.set(totalSlides - 1);
      } else if (newIndex === totalSlides) {
        this.imageIndex$.set(0);
      } else {
        this.imageIndex$.set(newIndex);
      }
      this.startTouch$.set(null);
      this.lastTouch$.set(null);
      this.animationEnd.emit();
      return;
    }

    // Set animating flag and clear host bindings so animation has full control
    this.isAnimating$.set(true);
    if (orientation === 'horizontal') {
      this.offsetLeft = null;
      this.offsetRight = null;
    } else {
      this.offsetTopPx = null;
      this.offsetBottomPx = null;
    }

    if (orientation === 'horizontal') {
      this.pendingAnimation = this.animationBuilder.build([
        style({
          'margin-left': (-(oldIndex + 1) * containerLength + distance) + 'px',
          'margin-right': ((oldIndex + 1) * containerLength - distance) + 'px',
        }),
        animate('500ms ease', style({
          'margin-left': (-(newIndex + 1) * containerLength) + 'px',
          'margin-right': ((newIndex + 1) * containerLength) + 'px',
        })),
      ]).create(containerElement);
    } else {
      this.pendingAnimation = this.animationBuilder.build([
        style({
          'margin-top': (-(oldIndex + 1) * containerLength + distance) + 'px',
          'margin-bottom': ((oldIndex + 1) * containerLength - distance) + 'px',
        }),
        animate('500ms ease', style({
          'margin-top': (-(newIndex + 1) * containerLength) + 'px',
          'margin-bottom': ((newIndex + 1) * containerLength) + 'px',
        })),
      ]).create(containerElement);
    }
    this.pendingAnimation.onDone(() => {
      // Correct the image index
      if (newIndex === -1) {
        this.imageIndex$.set(totalSlides - 1);
      } else if (newIndex === totalSlides) {
        this.imageIndex$.set(0);
      } else {
        this.imageIndex$.set(newIndex);
      }
      this.startTouch$.set(null);
      this.lastTouch$.set(null);
      this.pendingAnimation?.destroy();
      this.pendingAnimation = undefined;
      // Clear animating flag so effects can update offsets again
      this.isAnimating$.set(false);
      this.animationEnd.emit();
    });
    this.pendingAnimation.play();
  }

  onSwipe(distance: number) {
    this.animateToIndexByDx(distance);
  }

  previous() {
    this.gotoAnimate(-1, 'relative');
  }

  next() {
    this.gotoAnimate(1, 'relative');
  }

  goto(index: number) {
    this.gotoAnimate(index, 'absolute');
  }

  private gotoAnimate(index: number, type: 'absolute' | 'relative') {
    this.pendingAnimation?.finish();
    setTimeout(() => {
      this.pendingAnimation?.finish();
      const actualSwipes = this.actualSwipes$();
      const imageIndex = this.imageIndex$();
      const idx = (type === 'relative') ? imageIndex + index : index;
      this.animateToIndex(imageIndex, idx, 0, actualSwipes?.length ?? 1);
    }, 20);
  }

}
