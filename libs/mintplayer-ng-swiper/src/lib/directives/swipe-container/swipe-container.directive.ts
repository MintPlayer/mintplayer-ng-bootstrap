import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { DOCUMENT } from '@angular/common';
import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Inject, Input, Output, QueryList } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, delay, filter, map, mergeMap, Observable, take } from 'rxjs';
import { Point } from '../../interfaces/point';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { Direction } from '../../types/direction.type';
import { BsSwipeDirective } from '../swipe/swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  exportAs: 'bsSwipeContainer'
})
export class BsSwipeContainerDirective implements AfterViewInit {

  constructor(element: ElementRef, private animationBuilder: AnimationBuilder, @Inject(DOCUMENT) document: any, @SkipSelf() @Host() @Optional() @Inject(BsSwipeContainerDirective) private parentSwipeContainers: BsSwipeContainerDirective[]) {
    this.containerElement = element;
    this.document = <Document>document;
    this.offset$ = combineLatest([this.direction$, this.startTouch$, this.lastTouch$, this.imageIndex$, this.isViewInited$])
      .pipe(map(([direction, startTouch, lastTouch, imageIndex, isViewInited]) => {
        if (!isViewInited) {
          return (-imageIndex * 100);
        } else if (!!startTouch && !!lastTouch) {
          switch (direction) {
            case 'horizontal':
              return (-imageIndex * 100 + (lastTouch.position.x - startTouch.position.x) / this.containerElement.nativeElement.clientWidth * 100);
            case 'vertical':
              // TODO
              // const curHeight = swipes[imageIndex].nativeElement.clientHeight
              // px => sum
              return (-imageIndex * 100 + (lastTouch.position.y - startTouch.position.y) / this.containerElement.nativeElement.clientHeight * 100);
            default:
              throw '[carousel] Invalid value for direction';
          }
        } else {
          return (-imageIndex * 100);
        }
      }));

      this.padStart$ = this.swipes$.pipe(map(swipes => {
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

      this.padEnd$ = this.swipes$.pipe(map(swipes => {
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

    this.offsetStart$ = combineLatest([this.offset$, this.padStart$])
      .pipe(map(([offset, padStart]) => offset - padStart * 100));
    this.offsetEnd$ = combineLatest([this.offset$, this.padStart$, this.padEnd$])
      .pipe(map(([offset, padStart, padEnd]) => -(offset - padStart * 100) - (padEnd - 1) * 100));
    combineLatest([this.direction$, this.offsetStart$])
      .pipe(takeUntilDestroyed())
      .subscribe(([direction, offsetStart]) => {
        switch (direction) {
          case 'horizontal':
            this.offsetTop = this.offsetBottom = null;
            this.offsetLeft = offsetStart;
            break;
          case 'vertical':
            this.offsetLeft = this.offsetRight = null;
            this.offsetTop = offsetStart;
            break;
          default:
            throw '[BsCarousel] Invalid value for direction';
        }
      });
    combineLatest([this.direction$, this.offsetEnd$])
      .pipe(takeUntilDestroyed())
      .subscribe(([direction, offsetEnd]) => {
        switch (direction) {
          case 'horizontal':
            this.offsetTop = this.offsetBottom = null;
            this.offsetRight = offsetEnd;
            break;
          case 'vertical':
            this.offsetLeft = this.offsetRight = null;
            this.offsetBottom = offsetEnd;
            break;
          default:
            throw '[BsCarousel] Invalid value for direction';
        }
      });
    this.imageIndex$
      .pipe(takeUntilDestroyed())
      .subscribe((imageIndex) => this.imageIndexChange.emit(imageIndex));

    this.actualSwipes$ = this.swipes$
      .pipe(map(swipes => {
        if (swipes) {
          return swipes.filter(swipe => !swipe.offside);
        } else {
          return [];
        }
      }));

    this.slideHeights$ = this.actualSwipes$
      .pipe(delay(400), filter(swipes => !!swipes))
      // .pipe(map(swipes => <QueryList<BsSwipeDirective>>swipes))
      .pipe(mergeMap(swipes => combineLatest(swipes.map(swipe => swipe.slideHeight$))));

    this.currentSlideHeight$ = combineLatest([this.slideHeights$, this.imageIndex$])
      .pipe(map(([slideHeights, imageIndex]) => {
        const maxHeight = Math.max(...slideHeights);
        const currHeight: number = slideHeights[imageIndex] ?? maxHeight;
        return maxHeight - (maxHeight - currHeight)/* / 2*/;
      }));

    this.direction$.pipe(takeUntil(this.destroyed$))
      .subscribe((direction) => this.w100class = (direction === 'vertical'));
  }

  @HostBinding('style.margin-left.%') offsetLeft: number | null = null;
  @HostBinding('style.margin-right.%') offsetRight: number | null = null;
  @HostBinding('style.margin-top.%') offsetTop: number | null = null;
  @HostBinding('style.margin-bottom.%') offsetBottom: number | null = null;
  @HostBinding('class.w-100') w100class = false;
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
  
  @Input() public set direction(value: Direction) {
    this.direction$.next(value);
  }

  actualSwipes$: Observable<BsSwipeDirective[]>;
  isViewInited$ = new BehaviorSubject<boolean>(false);
  startTouch$ = new BehaviorSubject<StartTouch | null>(null);
  lastTouch$ = new BehaviorSubject<LastTouch | null>(null);
  swipes$ = new BehaviorSubject<QueryList<BsSwipeDirective> | null>(null);
  direction$ = new BehaviorSubject<Direction>('horizontal');
  imageIndex$ = new BehaviorSubject<number>(0);
  slideHeights$: Observable<number[]>;
  currentSlideHeight$: Observable<number>;
  pendingAnimation?: AnimationPlayer;
  containerElement: ElementRef<HTMLDivElement>;
  document: Document;

  offset$: Observable<number>;
  offsetStart$: Observable<number>;
  offsetEnd$: Observable<number>;
  padStart$: Observable<number>;
  padEnd$: Observable<number>;

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  animateToIndexByDelta(delta: number) {
    combineLatest([this.direction$, this.imageIndex$, this.actualSwipes$]).pipe(take(1))
      .subscribe(([direction, imageIndex, actualSwipes]) => {
        let way: 'previous' | 'next';
        switch (direction) {
          case 'horizontal':
            way = delta > 0 ? 'previous' : 'next';
            console.log('log', { direction, way, delta });
            break;
          case 'vertical':
            way = delta > 0 ? 'previous' : 'next';
            break;
          default:
            throw '[BsCarousel] Invalid value for direction';
        }
      
        let newIndex: number;
        if (Math.abs(delta) < this.minimumOffset) {
          newIndex = imageIndex;
        } else {
          newIndex = imageIndex + (way === 'next' ? 1 : -1);
        }
  
        this.animateToIndex(imageIndex, newIndex, direction, delta, actualSwipes?.length ?? 1);
      });
  }

  animateToIndex(oldIndex: number, newIndex: number, direction: Direction, delta: number, totalSlides: number) {
    let dStart: number;
    let dEnd: number;
    let startProperty: string;
    let endProperty: string;
    switch (direction) {
      case 'horizontal':
        dStart = (oldIndex + 1) * this.containerElement.nativeElement.clientWidth;
        dEnd = (newIndex + 1) * this.containerElement.nativeElement.clientWidth;
        startProperty = 'margin-left';
        endProperty = 'margin-right';
        break;
      case 'vertical':
        // TODO
        // const curHeight = swipes[imageIndex].nativeElement.clientHeight
        // px => sum
        dStart = (oldIndex + 1) * this.containerElement.nativeElement.clientHeight;
        dEnd = (newIndex + 1) * this.containerElement.nativeElement.clientHeight;
        startProperty = 'margin-top';
        endProperty = 'margin-bottom';
        break;
      default:
        throw '[BsCarousel] Invalid value for direction';
    }

    console.log('animation', { [startProperty]: (-dStart + delta) + 'px', [endProperty]: (dStart - delta) + 'px' });
    this.pendingAnimation = this.animationBuilder.build([
      style({ [startProperty]: (-dStart + delta) + 'px', [endProperty]: (dStart - delta) + 'px' }),
      animate('500ms ease', style({ [startProperty]: (-dEnd) + 'px', [endProperty]: dEnd + 'px' })),
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

  onSwipe(start: Point, end: Point) {
    let delta: number;
    switch (this.direction$.value) {
      case 'horizontal':
        delta = end.x - start.x;
        break;
      case 'vertical':
        delta = end.y - start.y;
        break;
    }
    this.animateToIndexByDelta(delta);
  }

  previous() {
    this.pendingAnimation?.finish();
    combineLatest([this.direction$, this.actualSwipes$, this.imageIndex$]).pipe(take(1)).subscribe(([direction, actualSwipes, imageIndex]) => {
      setTimeout(() => this.animateToIndex(imageIndex, imageIndex - 1, direction, 0, actualSwipes?.length ?? 1), 20);
    });
  }

  next() {
    this.pendingAnimation?.finish();
    combineLatest([this.direction$, this.actualSwipes$, this.imageIndex$]).pipe(take(1)).subscribe(([direction, actualSwipes, imageIndex]) => {
      setTimeout(() => this.animateToIndex(imageIndex, imageIndex + 1, direction, 0, actualSwipes?.length ?? 1), 20);
    });
  }

  goto(index: number) {
    combineLatest([this.direction$, this.actualSwipes$, this.imageIndex$]).pipe(take(1)).subscribe(([direction, actualSwipes, imageIndex]) => {
      this.pendingAnimation?.finish();
      setTimeout(() => this.animateToIndex(imageIndex, index, direction, 0, actualSwipes?.length ?? 1), 20);
    });
  }

}
