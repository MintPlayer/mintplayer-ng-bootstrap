import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { DOCUMENT } from '@angular/common';
import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Inject, Input, Output, QueryList } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, debounce, debounceTime, delay, filter, forkJoin, map, mergeMap, Observable, take } from 'rxjs';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { BsSwipeDirective } from '../swipe/swipe.directive';
import { Orientation } from '../../types/orientation';
import { BsObserveSizeDirective, Size } from '@mintplayer/ng-swiper/observe-size';

@Directive({
  selector: '[bsSwipeContainer]',
  exportAs: 'bsSwipeContainer',
  hostDirectives: [BsObserveSizeDirective]
})
export class BsSwipeContainerDirective implements AfterViewInit {

  constructor(element: ElementRef, private animationBuilder: AnimationBuilder, @Inject(DOCUMENT) document: any, private observeSize: BsObserveSizeDirective) {
    this.containerElement = element;
    this.document = <Document>document;
    this.offset$ = combineLatest([this.orientation$, this.observeSize.size$, this.startTouch$, this.lastTouch$, this.imageIndex$, this.isViewInited$])
      .pipe(map(([orientation, size, startTouch, lastTouch, imageIndex, isViewInited]) => {
        if (!isViewInited || !startTouch || !lastTouch) {
          return (-imageIndex * 100);
        } else {
          if (orientation === 'horizontal') {
            return (-imageIndex * 100 + (lastTouch.position.x - startTouch.position.x) / this.containerElement.nativeElement.clientWidth * 100);
          } else {
            return (-imageIndex * 100 + (lastTouch.position.y - startTouch.position.y) / this.containerElement.nativeElement.clientHeight * 100);
          }
        }
      }));

      this.padBefore$ = this.swipes$.pipe(map(swipes => {
        if (!swipes) {
          return 0;
        }

        let count = 0;
        for (const s of swipes) {
          if (!s.offside) {
            break;
          } else {
            count++;
          }
        }
        return count;
      }));

      this.padAfter$ = this.swipes$.pipe(map(swipes => {
        if (!swipes) {
          return 0;
        }

        let count = 0;
        for (const s of swipes.toArray().reverse()) {
          if (!s.offside) {
            break;
          } else {
            count++;
          }
        }
        return count;
      }));

    this.offsetBefore$ = combineLatest([this.offset$, this.padBefore$])
      .pipe(map(([offset, padBefore]) => offset - padBefore * 100));
    this.offsetAfter$ = combineLatest([this.offset$, this.padBefore$, this.padAfter$])
      .pipe(map(([offset, padBefore, padAfter]) => -(offset - padBefore * 100) - (padAfter - 1) * 100));

    this.imageIndex$.pipe(takeUntilDestroyed())
      .subscribe(imageIndex => this.imageIndexChange.emit(imageIndex));

    this.actualSwipes$ = this.swipes$
      .pipe(map(swipes => {
        if (swipes) {
          return swipes.filter(swipe => !swipe.offside);
        } else {
          return [];
        }
      }));

    this.slideSizes$ = this.actualSwipes$
      .pipe(delay(400), filter(swipes => !!swipes))
      .pipe(mergeMap(swipes => combineLatest(swipes.map(swipe => swipe.observeSize.size$))));

    this.currentSlideHeight$ = combineLatest([this.slideSizes$, this.imageIndex$, this.orientation$])
      .pipe(map(([slideSizes, imageIndex, orientation]) => {
        const maxHeight = Math.max(...slideSizes.map(s => s?.height ?? 1));
        console.log('maxHeight', {maxHeight, slideSizes});
        const currHeight: number = slideSizes[imageIndex]?.height ?? maxHeight;
        switch (orientation) {
          case 'horizontal': return currHeight;
          case 'vertical': return maxHeight;
        }
      }))
      .pipe(debounceTime(10));

    combineLatest([this.offsetBefore$, this.orientation$]).pipe(takeUntilDestroyed())
      .subscribe(([offsetBefore, orientation]) => {
        if (orientation === 'horizontal') {
          this.offsetLeft = offsetBefore;
          this.offsetTop = 0;
        } else {
          this.offsetLeft = 0;
          this.offsetTop = offsetBefore;
        }
      });

    combineLatest([this.offsetAfter$, this.orientation$]).pipe(takeUntilDestroyed())
      .subscribe(([offsetAfter, orientation]) => {
        if (orientation === 'horizontal') {
          this.offsetRight = offsetAfter;
          this.offsetBottom = 0;
        } else {
          this.offsetRight = 0;
          this.offsetBottom = offsetAfter;
        }
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

  //#region ImageIndex
  imageIndex$ = new BehaviorSubject<number>(0);
  public get imageIndex() {
    return this.imageIndex$.value;
  }
  @Input() public set imageIndex(value: number) {
    this.imageIndex$.next(value);
  }
  @Output() imageIndexChange = new EventEmitter<number>();
  //#endregion
  
  //#region Orientation
  orientation$ = new BehaviorSubject<Orientation>('horizontal');
  public get orientation() {
    return this.orientation$.value;
  }
  @Input() public set orientation(value: Orientation | null) {
    this.orientation$.next(value || 'horizontal');
  }
  //#endregion

  actualSwipes$: Observable<BsSwipeDirective[]>;
  isViewInited$ = new BehaviorSubject<boolean>(false);
  startTouch$ = new BehaviorSubject<StartTouch | null>(null);
  lastTouch$ = new BehaviorSubject<LastTouch | null>(null);
  swipes$ = new BehaviorSubject<QueryList<BsSwipeDirective> | null>(null);
  // TODO: slide sizes instead
  slideSizes$: Observable<(Size | undefined)[]>;
  currentSlideHeight$: Observable<number>;
  pendingAnimation?: AnimationPlayer;
  containerElement: ElementRef<HTMLDivElement>;
  document: Document;

  // TODO: Don't just keep px, but both px and % using currentslidesize$
  offset$: Observable<number>;
  offsetBefore$: Observable<number>;
  offsetAfter$: Observable<number>;
  padBefore$: Observable<number>;
  padAfter$: Observable<number>;

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  animateToIndexByDx(dx: number, dy: number) {
    combineLatest([this.orientation$, this.imageIndex$, this.actualSwipes$]).pipe(take(1))
      .subscribe(([orientation, imageIndex, actualSwipes]) => {
        const delta = (orientation === 'horizontal') ? dx : dy;


        const direction = delta > 0 ? 'back' : 'forward';
      
        let newIndex: number;
        if (Math.abs(delta) < this.minimumOffset) {
          newIndex = imageIndex;
        } else {
          newIndex = imageIndex + (direction === 'forward' ? 1 : -1);
        }
  
        this.animateToIndex(orientation, imageIndex, newIndex, delta, actualSwipes?.length ?? 1);
      });
  }

  animateToIndex(orientation: Orientation, oldIndex: number, newIndex: number, dx: number, totalSlides: number) {
    if (orientation === 'horizontal') {
      this.pendingAnimation = this.animationBuilder.build([
        style({ 'margin-left': (-(oldIndex + 1) * this.containerElement.nativeElement.clientWidth + dx) + 'px', 'margin-right': ((oldIndex + 1) * this.containerElement.nativeElement.clientWidth - dx) + 'px' }),
        animate('500ms ease', style({ 'margin-left': (-(newIndex + 1) * this.containerElement.nativeElement.clientWidth) + 'px', 'margin-right': ((newIndex + 1) * this.containerElement.nativeElement.clientWidth) + 'px' })),
      ]).create(this.containerElement.nativeElement);
    } else {
      this.pendingAnimation = this.animationBuilder.build([
        style({ 'margin-top': (-(oldIndex + 1) * this.containerElement.nativeElement.clientHeight + dx) + 'px', 'margin-bottom': ((oldIndex + 1) * this.containerElement.nativeElement.clientHeight - dx) + 'px' }),
        animate('500ms ease', style({ 'margin-top': (-(newIndex + 1) * this.containerElement.nativeElement.clientHeight) + 'px', 'margin-bottom': ((newIndex + 1) * this.containerElement.nativeElement.clientHeight) + 'px' })),
      ]).create(this.containerElement.nativeElement);
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

  onSwipe(dx: number, dy: number) {
    this.animateToIndexByDx(dx, dy);
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
      combineLatest([this.orientation$, this.actualSwipes$, this.imageIndex$]).pipe(take(1)).subscribe(([orientation, actualSwipes, imageIndex]) => {
        this.pendingAnimation?.finish();
        const idx = (type === 'relative') ? imageIndex + index : index;
        this.animateToIndex(orientation, imageIndex, idx, 0, actualSwipes?.length ?? 1);
      });
    }, 20);
  }

}
