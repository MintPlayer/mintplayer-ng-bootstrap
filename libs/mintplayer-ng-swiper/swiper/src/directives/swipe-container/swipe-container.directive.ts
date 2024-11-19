import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Inject, Input, Output, QueryList } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, delay, filter, map, mergeMap, Observable, take } from 'rxjs';
import { BsObserveSizeDirective, Size } from '@mintplayer/ng-swiper/observe-size';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { BsSwipeDirective } from '../swipe/swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  standalone: false,
  exportAs: 'bsSwipeContainer',
  hostDirectives: [BsObserveSizeDirective]
})
export class BsSwipeContainerDirective implements AfterViewInit {

  constructor(element: ElementRef, private animationBuilder: AnimationBuilder, @Inject(DOCUMENT) document: any, private observeSize: BsObserveSizeDirective) {
    this.containerElement = element;
    this.document = <Document>document;
    this.offset$ = combineLatest([this.startTouch$, this.lastTouch$, this.imageIndex$, this.isViewInited$])
      .pipe(map(([startTouch, lastTouch, imageIndex, isViewInited]) => {
        if (!isViewInited) {
          return (-imageIndex * 100);
        } else if (!!startTouch && !!lastTouch) {
          return (-imageIndex * 100 + (lastTouch.position.x - startTouch.position.x) / this.containerElement.nativeElement.clientWidth * 100);
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
          if (!s.offside) {
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
          if (!s.offside) {
            break;
          } else {
            count++;
          }
        }
        return count;
      }));

    this.offsetLeft$ = combineLatest([this.offset$, this.padLeft$])
      .pipe(map(([offset, padLeft]) => offset - padLeft * 100));
    this.offsetRight$ = combineLatest([this.offset$, this.padLeft$, this.padRight$])
      .pipe(map(([offset, padLeft, padRight]) => -(offset - padLeft * 100) - (padRight - 1) * 100));
    this.offsetLeft$.pipe(takeUntilDestroyed())
      .subscribe(offsetLeft => this.offsetLeft = offsetLeft);
    this.offsetRight$.pipe(takeUntilDestroyed())
      .subscribe(offsetRight => this.offsetRight = offsetRight);
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

    this.currentSlideHeight$ = combineLatest([this.slideSizes$, this.imageIndex$])
      .pipe(map(([slideSizes, imageIndex]) => {
        const maxHeight = Math.max(...slideSizes.map(s => s?.height ?? 1));
        console.log('maxHeight', {maxHeight, slideSizes});
        const currHeight: number = slideSizes[imageIndex]?.height ?? maxHeight;
        // switch (orientation) {
        //   case 'horizontal':
            return currHeight;
        //   case 'vertical':
        //     return maxHeight;
        // }
      }))
      .pipe(debounceTime(10));
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
  imageIndex$ = new BehaviorSubject<number>(0);
  currentSlideHeight$: Observable<number>;
  pendingAnimation?: AnimationPlayer;
  containerElement: ElementRef<HTMLDivElement>;
  document: Document;

  // TODO: Don't just keep px, but both px and % using currentslidesize$
  offset$: Observable<number>;
  offsetLeft$: Observable<number>;
  offsetRight$: Observable<number>;
  padLeft$: Observable<number>;
  padRight$: Observable<number>;

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  animateToIndexByDx(dx: number) {
    combineLatest([this.imageIndex$, this.actualSwipes$]).pipe(take(1))
      .subscribe(([imageIndex, actualSwipes]) => {
        const direction = dx > 0 ? 'left' : 'right';
      
        let newIndex: number;
        if (Math.abs(dx) < this.minimumOffset) {
          newIndex = imageIndex;
        } else {
          newIndex = imageIndex + (direction === 'right' ? 1 : -1);
        }
  
        this.animateToIndex(imageIndex, newIndex, dx, actualSwipes?.length ?? 1);
      });
  }

  animateToIndex(oldIndex: number, newIndex: number, dx: number, totalSlides: number) {
    this.pendingAnimation = this.animationBuilder.build([
      style({ 'margin-left': (-(oldIndex + 1) * this.containerElement.nativeElement.clientWidth + dx) + 'px', 'margin-right': ((oldIndex + 1) * this.containerElement.nativeElement.clientWidth - dx) + 'px' }),
      animate('500ms ease', style({ 'margin-left': (-(newIndex + 1) * this.containerElement.nativeElement.clientWidth) + 'px', 'margin-right': ((newIndex + 1) * this.containerElement.nativeElement.clientWidth) + 'px' })),
    ]).create(this.containerElement.nativeElement);
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

  onSwipe(dx: number) {
    this.animateToIndexByDx(dx);
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
      combineLatest([this.actualSwipes$, this.imageIndex$]).pipe(take(1)).subscribe(([actualSwipes, imageIndex]) => {
        this.pendingAnimation?.finish();
        const idx = (type === 'relative') ? imageIndex + index : index;
        this.animateToIndex(imageIndex, idx, 0, actualSwipes?.length ?? 1);
      });
    }, 20);
  }

}
