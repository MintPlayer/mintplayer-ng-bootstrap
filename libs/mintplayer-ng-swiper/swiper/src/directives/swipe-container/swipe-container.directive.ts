import { DOCUMENT } from '@angular/common';
import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { AfterViewInit, computed, contentChildren, Directive, effect, ElementRef, inject, input, model, OnDestroy, output, signal } from '@angular/core';
import { BsObserveSizeDirective, Size } from '@mintplayer/ng-swiper/observe-size';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { BsSwipeDirective } from '../swipe/swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  exportAs: 'bsSwipeContainer',
  hostDirectives: [BsObserveSizeDirective],
  host: {
    '[style.margin-left.%]': 'offsetLeft()',
    '[style.margin-right.%]': 'offsetRight()',
    '[style.margin-top.px]': 'offsetTopPx()',
    '[style.margin-bottom.px]': 'offsetBottomPx()',
  },
})
export class BsSwipeContainerDirective implements AfterViewInit, OnDestroy {
  private animationBuilder = inject(AnimationBuilder);
  private observeSize = inject(BsObserveSizeDirective);
  containerElement = inject(ElementRef<HTMLDivElement>);
  document = inject(DOCUMENT) as Document;

  offsetLeft = signal<number | null>(null);
  offsetRight = signal<number | null>(null);
  offsetTopPx = signal<number | null>(null);
  offsetBottomPx = signal<number | null>(null);

  readonly swipes = contentChildren(BsSwipeDirective);

  minimumOffset = input(50);
  animation = input<'slide' | 'fade' | 'none'>('slide');
  orientation = input<'horizontal' | 'vertical'>('horizontal');
  imageIndex = model<number>(0);
  animationStart = output<void>();
  animationEnd = output<void>();

  isViewInited = signal<boolean>(false);
  isAnimating = signal<boolean>(false);
  private isDestroyed = false;
  startTouch = signal<StartTouch | null>(null);
  lastTouch = signal<LastTouch | null>(null);
  pendingAnimation?: AnimationPlayer;

  // Computed signals for derived state
  offset = computed(() => {
    const startTouch = this.startTouch();
    const lastTouch = this.lastTouch();
    const imageIndex = this.imageIndex();
    const isViewInited = this.isViewInited();
    const orientation = this.orientation();
    const containerSize = this.observeSize.size();
    const maxSlideHeight = this.maxSlideHeight();

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

  padLeft = computed(() => {
    const swipes = this.swipes();
    if (swipes.length === 0) return 1; // Default to 1 to prevent container collapse before swipes are loaded

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

  padRight = computed(() => {
    const swipes = this.swipes();
    if (swipes.length === 0) return 1; // Default to 1 to prevent container collapse before swipes are loaded

    let count = 0;
    for (const s of [...swipes].reverse()) {
      if (!s.offside()) {
        break;
      } else {
        count++;
      }
    }
    return count;
  });

  offsetPrimary = computed(() => this.offset() - this.padLeft() * 100);
  offsetSecondary = computed(() => -(this.offset() - this.padLeft() * 100) - (this.padRight() - 1) * 100);

  actualSwipes = computed(() => {
    const swipes = this.swipes();
    return swipes.filter(swipe => !swipe.offside());
  });

  // Computed signal that reactively tracks all swipe sizes
  private slideSizes = computed(() => {
    const actualSwipes = this.actualSwipes();
    if (!actualSwipes || actualSwipes.length === 0) {
      return [];
    }
    // Reading each swipe's size() creates reactive dependencies
    return actualSwipes.map(swipe => swipe.observeSize.size());
  });

  maxSlideHeight = computed(() => {
    const slideSizes = this.slideSizes();
    const heights = slideSizes.map(s => s?.height ?? 1);
    return heights.length ? Math.max(...heights) : 1;
  });

  currentSlideHeight = computed<number | null>(() => {
    const slideSizes = this.slideSizes();
    const imageIndex = this.imageIndex();
    const orientation = this.orientation();
    const heights = slideSizes.map(s => s?.height ?? 0);
    const maxHeight = heights.length ? Math.max(...heights) : 0;
    const currHeight: number = slideSizes[imageIndex]?.height ?? maxHeight;
    const result = (orientation === 'vertical') ? maxHeight : currHeight;
    // Return null if measurements aren't valid yet to avoid collapsing the carousel
    return result > 10 ? result : null;
  });

  constructor() {
    // Effect to update offsetLeft/offsetTopPx based on offsetPrimary and orientation
    effect(() => {
      const offsetPrimary = this.offsetPrimary();
      const orientation = this.orientation();
      const maxSlideHeight = this.maxSlideHeight();
      const isAnimating = this.isAnimating();

      // Skip updating offsets during animation to avoid interfering with CSS animation
      if (isAnimating) {
        return;
      }

      if (orientation === 'horizontal') {
        this.offsetLeft.set(offsetPrimary);
        this.offsetTopPx.set(null);
      } else {
        // For vertical mode, convert percentage to pixels using slide height
        // offsetPrimary is in percentage units (e.g., -100 means -100%)
        // We need to convert to pixels based on actual slide height
        this.offsetTopPx.set((offsetPrimary / 100) * maxSlideHeight);
        this.offsetLeft.set(null);
      }
    });

    // Effect to update offsetRight/offsetBottomPx based on offsetSecondary and orientation
    effect(() => {
      const offsetSecondary = this.offsetSecondary();
      const orientation = this.orientation();
      const maxSlideHeight = this.maxSlideHeight();
      const isAnimating = this.isAnimating();

      // Skip updating offsets during animation to avoid interfering with CSS animation
      if (isAnimating) {
        return;
      }

      if (orientation === 'horizontal') {
        this.offsetRight.set(offsetSecondary);
        this.offsetBottomPx.set(null);
      } else {
        // For vertical mode, convert percentage to pixels using slide height
        this.offsetBottomPx.set((offsetSecondary / 100) * maxSlideHeight);
        this.offsetRight.set(null);
      }
    });

  }

  ngAfterViewInit() {
    this.isViewInited.set(true);
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.pendingAnimation?.destroy();
  }

  animateToIndexByDx(distance: number) {
    const imageIndex = this.imageIndex();
    const actualSwipes = this.actualSwipes();

    let newIndex: number;
    if (Math.abs(distance) < this.minimumOffset()) {
      newIndex = imageIndex;
    } else {
      newIndex = imageIndex + (distance < 0 ? 1 : -1);
    }

    this.animateToIndex(imageIndex, newIndex, distance, actualSwipes?.length ?? 1);
  }

  animateToIndex(oldIndex: number, newIndex: number, distance: number, totalSlides: number) {
    const animation = this.animation();
    const orientation = this.orientation();
    const containerElement = this.containerElement.nativeElement;
    const maxSlideHeight = this.maxSlideHeight();
    // For vertical mode, use maxSlideHeight instead of container height
    const containerLength = orientation === 'horizontal'
      ? containerElement.clientWidth
      : maxSlideHeight;

    this.animationStart.emit();

    // Handle 'none' animation mode - instant transition
    if (animation === 'none') {
      // Correct the image index immediately
      if (newIndex === -1) {
        this.imageIndex.set(totalSlides - 1);
      } else if (newIndex === totalSlides) {
        this.imageIndex.set(0);
      } else {
        this.imageIndex.set(newIndex);
      }
      this.startTouch.set(null);
      this.lastTouch.set(null);
      this.animationEnd.emit();
      return;
    }

    // Set animating flag and clear host bindings so animation has full control
    this.isAnimating.set(true);
    if (orientation === 'horizontal') {
      this.offsetLeft.set(null);
      this.offsetRight.set(null);
    } else {
      this.offsetTopPx.set(null);
      this.offsetBottomPx.set(null);
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
      if (this.isDestroyed) return;
      // Correct the image index
      if (newIndex === -1) {
        this.imageIndex.set(totalSlides - 1);
      } else if (newIndex === totalSlides) {
        this.imageIndex.set(0);
      } else {
        this.imageIndex.set(newIndex);
      }
      this.startTouch.set(null);
      this.lastTouch.set(null);
      this.pendingAnimation?.destroy();
      this.pendingAnimation = undefined;
      // Clear animating flag so effects can update offsets again
      this.isAnimating.set(false);
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
      if (this.isDestroyed) return;
      this.pendingAnimation?.finish();
      const actualSwipes = this.actualSwipes();
      const imageIndex = this.imageIndex();
      const idx = (type === 'relative') ? imageIndex + index : index;
      this.animateToIndex(imageIndex, idx, 0, actualSwipes?.length ?? 1);
    }, 20);
  }

}
