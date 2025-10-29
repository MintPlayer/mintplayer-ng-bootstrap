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
    this.offset$ = combineLatest([
      this.startTouch$,
      this.lastTouch$,
      this.imageIndex$,
      this.isViewInited$,
      this.orientation$,
      this.observeSize.size$,
    ])
      .pipe(map(([startTouch, lastTouch, imageIndex, isViewInited, orientation, containerSize]) => {
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

    this.offsetPrimary$ = combineLatest([this.offset$, this.padLeft$])
      .pipe(map(([offset, padLeft]) => offset - padLeft * 100));
    this.offsetSecondary$ = combineLatest([this.offset$, this.padLeft$, this.padRight$])
      .pipe(map(([offset, padLeft, padRight]) => -(offset - padLeft * 100) - (padRight - 1) * 100));
    combineLatest([this.offsetPrimary$, this.orientation$])
      .pipe(takeUntilDestroyed())
      .subscribe(([offsetPrimary, orientation]) => {
        if (orientation === 'horizontal') {
          this.offsetLeft = offsetPrimary;
          this.offsetTop = null;
        } else {
          this.offsetTop = offsetPrimary;
          this.offsetLeft = null;
        }
      });
    combineLatest([this.offsetSecondary$, this.orientation$])
      .pipe(takeUntilDestroyed())
      .subscribe(([offsetSecondary, orientation]) => {
        if (orientation === 'horizontal') {
          this.offsetRight = offsetSecondary;
          this.offsetBottom = null;
        } else {
          this.offsetBottom = offsetSecondary;
          this.offsetRight = null;
        }
      });
    this.imageIndex$.pipe(takeUntilDestroyed())
      .subscribe(imageIndex => this.imageIndexChange.emit(imageIndex));

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
      .subscribe(() => {
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
          'margin-top': `${-(oldIndex + 1) * 100 + (distance / containerElement.clientHeight) * 100}%`,
          'margin-bottom': `${(oldIndex + 1) * 100 - (distance / containerElement.clientHeight) * 100}%`,
        }),
        animate('500ms ease', style({
          'margin-top': `${-(newIndex + 1) * 100}%`,
          'margin-bottom': `${(newIndex + 1) * 100}%`,
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
