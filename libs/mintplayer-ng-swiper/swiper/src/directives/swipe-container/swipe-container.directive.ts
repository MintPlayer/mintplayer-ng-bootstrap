import { DOCUMENT } from '@angular/common';
import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Inject, Input, Output, QueryList, Signal, computed, effect, signal, input, inject } from '@angular/core';
import { BsObserveSizeDirective, Size } from '@mintplayer/ng-swiper/observe-size';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { BsSwipeDirective } from '../swipe/swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  exportAs: 'bsSwipeContainer',
  hostDirectives: [BsObserveSizeDirective],
})
export class BsSwipeContainerDirective implements AfterViewInit {

  containerElement = inject(ElementRef);
  observeSize = inject(BsObserveSizeDirective);
  animationBuilder = inject(AnimationBuilder);
  document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      const offsetPrimary = this.offsetPrimary();
      const orientation = this.orientation();
      if (orientation === 'horizontal') {
        this.offsetLeft = offsetPrimary;
        this.offsetTop = null;
      } else {
        this.offsetTop = offsetPrimary;
        this.offsetLeft = null;
      }
    });

    effect(() => {
      const offsetSecondary = this.offsetSecondary();
      const orientation = this.orientation();
      if (orientation === 'horizontal') {
        this.offsetRight = offsetSecondary;
        this.offsetBottom = null;
      } else {
        this.offsetBottom = offsetSecondary;
        this.offsetRight = null;
      }
    });

    effect(() => {
      this.imageIndexChange.emit(this.imageIndexSignal());
    });

    effect(() => {
      // Reset offsets when orientation changes
      this.orientation();
      this.offsetLeft = null;
      this.offsetRight = null;
      this.offsetTop = null;
      this.offsetBottom = null;
    });
  }

  @HostBinding('style.margin-left.%') offsetLeft: number | null = null;
  @HostBinding('style.margin-right.%') offsetRight: number | null = null;
  @HostBinding('style.margin-top.%') offsetTop: number | null = null;
  @HostBinding('style.margin-bottom.%') offsetBottom: number | null = null;
  @ContentChildren(forwardRef(() => BsSwipeDirective)) set swipes(value: QueryList<BsSwipeDirective>) {
    setTimeout(() => this.swipesSignal.set(value));
  }
  @Input() minimumOffset = 50;

  //#region ImageIndex
  public get imageIndex() {
    return this.imageIndexSignal();
  }
  @Input() public set imageIndex(value: number) {
    this.imageIndexSignal.set(value);
  }
  @Output() imageIndexChange = new EventEmitter<number>();
  //#endregion

  isViewInited = signal<boolean>(false);
  startTouch = signal<StartTouch | null>(null);
  lastTouch = signal<LastTouch | null>(null);
  swipesSignal = signal<QueryList<BsSwipeDirective> | null>(null);
  imageIndexSignal = signal<number>(0);
  orientation = input<'horizontal' | 'vertical'>('horizontal');

  actualSwipes: Signal<BsSwipeDirective[]> = computed(() => {
    const swipes = this.swipesSignal();
    if (!swipes) {
      return [];
    }
    return swipes.toArray().filter(swipe => !swipe.offside());
  });

  slideSizes: Signal<(Size | undefined)[]> = computed(() => {
    return this.actualSwipes().map(swipe => swipe.observeSize.size());
  });

  maxSlideHeight: Signal<number> = computed(() => {
    const heights = this.slideSizes().map(s => s?.height ?? 1);
    return heights.length ? Math.max(...heights) : 1;
  });

  currentSlideHeight: Signal<number> = computed(() => {
    const slideSizes = this.slideSizes();
    const imageIndex = this.imageIndexSignal();
    const orientation = this.orientation();
    const heights = slideSizes.map(s => s?.height ?? 1);
    const maxHeight = heights.length ? Math.max(...heights) : 1;
    const currHeight: number = slideSizes[imageIndex]?.height ?? maxHeight;
    return (orientation === 'vertical') ? maxHeight : currHeight;
  });

  pendingAnimation?: AnimationPlayer;

  // TODO: Don't just keep px, but both px and % using currentslidesize$
  offset: Signal<number> = computed(() => {
    const startTouch = this.startTouch();
    const lastTouch = this.lastTouch();
    const imageIndex = this.imageIndexSignal();
    const isViewInited = this.isViewInited();
    const orientation = this.orientation();
    const containerSize = this.observeSize.size();

    if (!isViewInited) {
      return (-imageIndex * 100);
    } else if (!!startTouch && !!lastTouch) {
      const containerLength = orientation === 'horizontal'
        ? (containerSize?.width ?? this.containerElement.nativeElement.clientWidth)
        : (containerSize?.height ?? this.containerElement.nativeElement.clientHeight);
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

  padLeft: Signal<number> = computed(() => {
    const swipes = this.swipesSignal();
    if (!swipes) {
      return 0;
    }

    let count = 0;
    for (const s of swipes.toArray()) {
      if (!s.offside()) {
        break;
      } else {
        count++;
      }
    }
    return count;
  });

  padRight: Signal<number> = computed(() => {
    const swipes = this.swipesSignal();
    if (!swipes) {
      return 0;
    }

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

  offsetPrimary: Signal<number> = computed(() => this.offset() - this.padLeft() * 100);
  offsetSecondary: Signal<number> = computed(() => -(this.offset() - this.padLeft() * 100) - (this.padRight() - 1) * 100);

  ngAfterViewInit() {
    this.isViewInited.set(true);
  }

  animateToIndexByDx(distance: number) {
    const imageIndex = this.imageIndexSignal();
    const actualSwipes = this.actualSwipes();
    let newIndex: number;
    if (Math.abs(distance) < this.minimumOffset) {
      newIndex = imageIndex;
    } else {
      newIndex = imageIndex + (distance < 0 ? 1 : -1);
    }

    this.animateToIndex(imageIndex, newIndex, distance, actualSwipes?.length ?? 1);
  }

  animateToIndex(oldIndex: number, newIndex: number, distance: number, totalSlides: number) {
    const orientation = this.orientation();
    const containerElement = this.containerElement.nativeElement;
    const containerLength = orientation === 'horizontal' ? containerElement.clientWidth : containerElement.clientHeight;

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
        this.imageIndexSignal.set(totalSlides - 1);
      } else if (newIndex === totalSlides) {
        this.imageIndexSignal.set(0);
      } else {
        this.imageIndexSignal.set(newIndex);
      }
      this.startTouch.set(null);
      this.lastTouch.set(null);
      this.pendingAnimation?.destroy();
      this.pendingAnimation = undefined;
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
      const actualSwipes = this.actualSwipes();
      const imageIndex = this.imageIndexSignal();
      this.pendingAnimation?.finish();
      const idx = (type === 'relative') ? imageIndex + index : index;
      this.animateToIndex(imageIndex, idx, 0, actualSwipes?.length ?? 1);
    }, 20);
  }

}
