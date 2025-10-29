import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { AfterViewInit, ContentChildren, DestroyRef, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Inject, Input, Output, QueryList } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, delay, distinctUntilChanged, filter, map, mergeMap, Observable, shareReplay, take } from 'rxjs';
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

  constructor(element: ElementRef, private animationBuilder: AnimationBuilder, private destroy: DestroyRef, @Inject(DOCUMENT) document: any, private observeSize: BsObserveSizeDirective) {
    this.containerElement = element;
    this.document = <Document>document;

    
    this.actualSwipes$ = this.swipes$
      .pipe(map(swipes => {
        if (swipes) {
          return swipes.filter(swipe => !swipe.offside());
        } else {
          return [];
        }
      }));

    this.slideSizes$ = this.actualSwipes$
      .pipe(delay(400), filter(swipes => !!swipes))
      .pipe(mergeMap(swipes => combineLatest(swipes.map(swipe => swipe.observeSize.size$))))
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.maxSlideHeight$ = this.slideSizes$
      .pipe(map(slideSizes => {
        const heights = slideSizes.map(s => s?.height ?? 1);
        return heights.length ? Math.max(...heights) : 1;
      }))
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));

      
    this.offset$ = combineLatest([
      this.startTouch$,
      this.lastTouch$,
      this.imageIndex$,
      this.isViewInited$,
      this.orientation$,
      this.observeSize.size$,
      this.maxSlideHeight$,
    ])
      .pipe(map(([startTouch, lastTouch, imageIndex, isViewInited, orientation, containerSize, maxHeight]) => {
        if (!isViewInited) {
          return orientation === 'horizontal' ? (-imageIndex * 100) : (-imageIndex * maxHeight);
        } else if (!!startTouch && !!lastTouch) {
          const containerLength = orientation === 'horizontal'
            ? (containerSize?.width ?? this.containerElement.nativeElement.clientWidth)
            : (containerSize?.height ?? this.containerElement.nativeElement.clientHeight);
          const delta = orientation === 'horizontal'
            ? (lastTouch.position.x - startTouch.position.x)
            : (lastTouch.position.y - startTouch.position.y);
          
          if (orientation === 'horizontal') {
            return (containerLength === 0) ? (-imageIndex * 100) : (-imageIndex * 100 + (delta / containerLength) * 100);
          } else {
            return (-imageIndex * maxHeight + delta);
          }
        } else {
          return orientation === 'horizontal' ? (-imageIndex * 100) : (-imageIndex * maxHeight);
        }
      }));

    this.padLeft$ = this.swipes$.pipe(map(swipes => {
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
    }));

    this.padRight$ = this.swipes$.pipe(map(swipes => {
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
    }));

    this.offsetPrimary$ = combineLatest([this.offset$, this.padLeft$, this.orientation$, this.maxSlideHeight$])
      .pipe(map(([offset, padLeft, orientation, maxHeight]) => {
        return orientation === 'horizontal'
          ? (offset - padLeft * 100)
          : (offset - padLeft * maxHeight);
      }));
    this.offsetSecondary$ = combineLatest([this.offset$, this.padLeft$, this.padRight$, this.orientation$, this.maxSlideHeight$])
      .pipe(map(([offset, padLeft, padRight, orientation, maxHeight]) => {
        const unit = (orientation === 'horizontal') ? 100 : maxHeight;
        return -(offset - padLeft * unit) - (padRight - 1) * unit;
      }));

    // Apply offsets with correct units. Horizontal uses %, vertical uses px based on maxSlideHeight$.
    combineLatest([this.offsetPrimary$, this.orientation$, this.maxSlideHeight$])
      .pipe(takeUntilDestroyed())
      .subscribe(([offsetPrimary, orientation, maxHeight]) => {
        if (orientation === 'horizontal') {
          this.offsetLeft = offsetPrimary;
          this.offsetLeftUnit = '%';
          this.offsetTop = null;
          this.offsetTopUnit = null;
        } else {
          this.offsetTop = offsetPrimary;
          this.offsetTopUnit = 'px';
          this.offsetLeft = null;
          this.offsetLeftUnit = null;
        }
      });

    combineLatest([this.offsetSecondary$, this.orientation$, this.maxSlideHeight$])
      .pipe(takeUntilDestroyed())
      .subscribe(([offsetSecondary, orientation, maxHeight]) => {
        if (orientation === 'horizontal') {
          this.offsetRight = offsetSecondary;
          this.offsetRightUnit = '%';
          this.offsetBottom = null;
          this.offsetBottomUnit = null;
        } else {
          // For vertical, we don't need margin-bottom for positioning
          this.offsetBottom = null;
          this.offsetBottomUnit = 'px';
          this.offsetRight = null;
          this.offsetRightUnit = null;
        }
      });
    this.imageIndex$.pipe(takeUntilDestroyed())
      .subscribe(imageIndex => this.imageIndexChange.emit(imageIndex));

    this.currentSlideHeight$ = combineLatest([this.slideSizes$, this.imageIndex$, this.orientation$])
      .pipe(map(([slideSizes, imageIndex, orientation]) => {
        const heights = slideSizes.map(s => s?.height ?? 1);
        const maxHeight = heights.length ? Math.max(...heights) : 1;
        const currHeight: number = slideSizes[imageIndex]?.height ?? maxHeight;
        return (orientation === 'vertical') ? maxHeight : currHeight;
      }))
      .pipe(shareReplay({ bufferSize: 1, refCount: true }))
      .pipe(debounceTime(10));

    this.orientation$
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((orientation) => {
        // Reset values and allow re-computation with correct units
        // this.offsetLeft = null;
        // this.offsetRight = null;
        // this.offsetTop = null;
        // this.offsetBottom = null;
        this.offsetLeftUnit = (orientation === 'horizontal') ? '%' : null;
        this.offsetRightUnit = (orientation === 'horizontal') ? '%' : null;
        this.offsetTopUnit = (orientation === 'vertical') ? 'px' : null;
        this.offsetBottomUnit = (orientation === 'vertical') ? 'px' : null;
      });
  }

  @HostBinding('style.margin-left.%') get offsetLeftPerc() { return this.offsetLeftUnit === '%' ? this.offsetLeft : null; }
  @HostBinding('style.margin-right.%') get offsetRightPerc() { return this.offsetRightUnit === '%' ? this.offsetRight : null; }
  @HostBinding('style.margin-top.%') get offsetTopPerc() { return this.offsetTopUnit === '%' ? this.offsetTop : null; }
  @HostBinding('style.margin-bottom.%') get offsetBottomPerc() { return this.offsetBottomUnit === '%' ? this.offsetBottom : null; }
  @HostBinding('style.margin-left.px') get offsetLeftPx() { return this.offsetLeftUnit === 'px' ? this.offsetLeft : null; }
  @HostBinding('style.margin-right.px') get offsetRightPx() { return this.offsetRightUnit === 'px' ? this.offsetRight : null; }
  @HostBinding('style.margin-top.px') get offsetTopPx() { return this.offsetTopUnit === 'px' ? this.offsetTop : null; }
  @HostBinding('style.margin-bottom.px') get offsetBottomPx() { return this.offsetBottomUnit === 'px' ? this.offsetBottom : null; }
  offsetLeftUnit: '%' | 'px' | null = '%';
  offsetRightUnit: '%' | 'px' | null = '%';
  offsetTopUnit: '%' | 'px' | null = null;
  offsetBottomUnit: '%' | 'px' | null = null;
  offsetLeft: number | null = null;
  offsetRight: number | null = null;
  offsetTop: number | null = null;
  offsetBottom: number | null = null;

  @ContentChildren(forwardRef(() => BsSwipeDirective)) set swipes(value: QueryList<BsSwipeDirective>) {
    setTimeout(() => this.swipes$.next(value));
  }
  @Input() minimumOffset = 50;

  public get orientation() {
    return this.orientation$.value;
  }
  @Input() public set orientation(value: 'horizontal' | 'vertical') {
    setTimeout(() => this.orientation$.next(value ?? 'horizontal'), 0);
  }

  //#region ImageIndex
  public get imageIndex() {
    return this.imageIndex$.value;
  }
  @Input() public set imageIndex(value: number) {
    this.imageIndex$.next(value);
  }
  @Output() imageIndexChange = new EventEmitter<number>();
  //#endregion
  
  actualSwipes$: Observable<BsSwipeDirective[]>;
  isViewInited$ = new BehaviorSubject<boolean>(false);
  startTouch$ = new BehaviorSubject<StartTouch | null>(null);
  lastTouch$ = new BehaviorSubject<LastTouch | null>(null);
  swipes$ = new BehaviorSubject<QueryList<BsSwipeDirective> | null>(null);
  // TODO: slide sizes instead
  slideSizes$: Observable<(Size | undefined)[]>;
  maxSlideHeight$: Observable<number>;
  imageIndex$ = new BehaviorSubject<number>(0);
  currentSlideHeight$: Observable<number>;
  pendingAnimation?: AnimationPlayer;
  containerElement: ElementRef<HTMLDivElement>;
  document: Document;

  // TODO: Don't just keep px, but both px and % using currentslidesize$
  offset$: Observable<number>;
  offsetPrimary$: Observable<number>;
  offsetSecondary$: Observable<number>;
  padLeft$: Observable<number>;
  padRight$: Observable<number>;

  orientation$ = new BehaviorSubject<'horizontal' | 'vertical'>('horizontal');

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  animateToIndexByDx(distance: number) {
    combineLatest([this.imageIndex$, this.actualSwipes$])
      .pipe(take(1), takeUntilDestroyed(this.destroy))
      .subscribe(([imageIndex, actualSwipes]) => {
        let newIndex: number;
        if (Math.abs(distance) < this.minimumOffset) {
          newIndex = imageIndex;
        } else {
          newIndex = imageIndex + (distance < 0 ? 1 : -1);
        }

        this.animateToIndex(imageIndex, newIndex, distance, actualSwipes?.length ?? 1);
      });
  }

  animateToIndex(oldIndex: number, newIndex: number, distance: number, totalSlides: number) {
    combineLatest([this.maxSlideHeight$, this.padLeft$])
      .pipe(take(1), takeUntilDestroyed(this.destroy))
      .subscribe(([maxHeight, padLeft]) => {
      const containerElement = this.containerElement.nativeElement;

      if (this.orientation === 'horizontal') {
        this.pendingAnimation = this.animationBuilder.build([
          style({
            'margin-left': `${-(oldIndex + 1) * 100 + (distance / containerElement.clientWidth) * 100}%`,
            'margin-right': `${(oldIndex + 1) * 100 - (distance / containerElement.clientWidth) * 100}%`,
          }),
          animate('500ms ease', style({
            'margin-left': `${-(newIndex + 1) * 100}%`,
            'margin-right': `${(newIndex + 1) * 100}%`,
          })),
        ]).create(containerElement);
      } else {
        this.pendingAnimation = this.animationBuilder.build([
          style({
            'margin-top': `${-(oldIndex + (padLeft ?? 0)) * maxHeight + distance}px`,
          }),
          animate('500ms ease', style({
            'margin-top': `${-(newIndex + (padLeft ?? 0)) * maxHeight}px`,
          })),
        ]).create(containerElement);
      }

      this.pendingAnimation.onDone(() => {
        // Correct the image index
        if (newIndex === -1) {
          this.imageIndex$.next(totalSlides - 1);
        } else if (newIndex === totalSlides) {
          this.imageIndex$.next(0);
        } else {
          this.imageIndex$.next(newIndex);
        }
        this.startTouch$.next(null);
        this.lastTouch$.next(null);
        this.pendingAnimation?.destroy();
        this.pendingAnimation = undefined;
      });
      this.pendingAnimation.play();
    });
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
      combineLatest([this.actualSwipes$, this.imageIndex$])
        .pipe(take(1), takeUntilDestroyed(this.destroy))
        .subscribe(([actualSwipes, imageIndex]) => {
          this.pendingAnimation?.finish();
          const idx = (type === 'relative') ? imageIndex + index : index;
          this.animateToIndex(imageIndex, idx, 0, actualSwipes?.length ?? 1);
        });
    }, 20);
  }

}
