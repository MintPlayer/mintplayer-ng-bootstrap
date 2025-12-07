import { DOCUMENT } from '@angular/common';
import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Inject, Input, Output, QueryList, signal, computed, effect, untracked, model } from '@angular/core';
import { BsObserveSizeDirective, Size } from '@mintplayer/ng-swiper/observe-size';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { BsSwipeDirective } from '../swipe/swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  exportAs: 'bsSwipeContainer',
  standalone: false,
  hostDirectives: [BsObserveSizeDirective],
})
export class BsSwipeContainerDirective implements AfterViewInit {

  constructor(element: ElementRef, private animationBuilder: AnimationBuilder, @Inject(DOCUMENT) document: any, private observeSize: BsObserveSizeDirective) {
    this.containerElement = element;
    this.document = <Document>document;

    this.offset = computed(() => {
      const startTouch = this.startTouch();
      const lastTouch = this.lastTouch();
      const imageIndex = this.imageIndex();
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

    this.padLeft = computed(() => {
      const swipes = this.swipes();
      if (!swipes) {
        return 0;
      }

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

    this.padRight = computed(() => {
      const swipes = this.swipes();
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

    this.offsetPrimary = computed(() => this.offset() - this.padLeft() * 100);
    this.offsetSecondary = computed(() => -(this.offset() - this.padLeft() * 100) - (this.padRight() - 1) * 100);

    this.actualSwipes = computed(() => {
      const swipes = this.swipes();
      if (swipes) {
        return swipes.filter(swipe => !swipe.offside());
      } else {
        return [];
      }
    });

    this.maxSlideHeight = computed(() => {
      const slideSizes = this.slideSizes();
      const heights = slideSizes.map(s => s?.height ?? 1);
      return heights.length ? Math.max(...heights) : 1;
    });

    this.currentSlideHeight = computed(() => {
      const slideSizes = this.slideSizes();
      const imageIndex = this.imageIndex();
      const orientation = this.orientation();
      const heights = slideSizes.map(s => s?.height ?? 1);
      const maxHeight = heights.length ? Math.max(...heights) : 1;
      const currHeight: number = slideSizes[imageIndex]?.height ?? maxHeight;
      return (orientation === 'vertical') ? maxHeight : currHeight;
    });

    // Effect to update offsetLeft/offsetTop based on orientation
    effect(() => {
      const offsetPrimary = this.offsetPrimary();
      const orientation = this.orientation();
      untracked(() => {
        if (orientation === 'horizontal') {
          this.offsetLeft = offsetPrimary;
          this.offsetTop = null;
        } else {
          this.offsetTop = offsetPrimary;
          this.offsetLeft = null;
        }
      });
    });

    // Effect to update offsetRight/offsetBottom based on orientation
    effect(() => {
      const offsetSecondary = this.offsetSecondary();
      const orientation = this.orientation();
      untracked(() => {
        if (orientation === 'horizontal') {
          this.offsetRight = offsetSecondary;
          this.offsetBottom = null;
        } else {
          this.offsetBottom = offsetSecondary;
          this.offsetRight = null;
        }
      });
    });


    // Effect to reset offsets when orientation changes
    let previousOrientation: 'horizontal' | 'vertical' | null = null;
    effect(() => {
      const orientation = this.orientation();
      if (previousOrientation !== null && previousOrientation !== orientation) {
        untracked(() => {
          this.offsetLeft = null;
          this.offsetRight = null;
          this.offsetTop = null;
          this.offsetBottom = null;
        });
      }
      previousOrientation = orientation;
    });

    // Effect to update slide sizes when swipes change
    effect(() => {
      const actualSwipes = this.actualSwipes();
      // Delay to allow for rendering
      setTimeout(() => {
        if (actualSwipes && actualSwipes.length > 0) {
          const sizes = actualSwipes.map(swipe => swipe.observeSize.size());
          this.slideSizes.set(sizes);
        }
      }, 400);
    });
  }

  @HostBinding('style.margin-left.%') offsetLeft: number | null = null;
  @HostBinding('style.margin-right.%') offsetRight: number | null = null;
  @HostBinding('style.margin-top.%') offsetTop: number | null = null;
  @HostBinding('style.margin-bottom.%') offsetBottom: number | null = null;
  @ContentChildren(forwardRef(() => BsSwipeDirective)) set swipesQuery(value: QueryList<BsSwipeDirective>) {
    setTimeout(() => this.swipes.set(value));
  }
  @Input() minimumOffset = 50;

  //#region Orientation
  orientation = model<'horizontal' | 'vertical'>('horizontal');
  //#endregion

  //#region ImageIndex
  imageIndex = model<number>(0);
  //#endregion

  actualSwipes;
  isViewInited = signal<boolean>(false);
  startTouch = signal<StartTouch | null>(null);
  lastTouch = signal<LastTouch | null>(null);
  swipes = signal<QueryList<BsSwipeDirective> | null>(null);
  slideSizes = signal<(Size | undefined)[]>([]);
  maxSlideHeight;
  currentSlideHeight;
  pendingAnimation?: AnimationPlayer;
  containerElement: ElementRef<HTMLDivElement>;
  document: Document;

  offset;
  offsetPrimary;
  offsetSecondary;
  padLeft;
  padRight;

  ngAfterViewInit() {
    this.isViewInited.set(true);
  }

  animateToIndexByDx(distance: number) {
    const imageIndex = this.imageIndex();
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
      const imageIndex = this.imageIndex();
      this.pendingAnimation?.finish();
      const idx = (type === 'relative') ? imageIndex + index : index;
      this.animateToIndex(imageIndex, idx, 0, actualSwipes?.length ?? 1);
    }, 20);
  }

}
