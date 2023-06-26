import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { DOCUMENT } from '@angular/common';
import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Inject, Input, Output, QueryList } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, delay, filter, from, map, mergeMap, Observable, of, reduce, switchMap, take } from 'rxjs';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { BsSwipeDirective } from '../swipe/swipe.directive';
import { Orientation } from '../../types/orientation';

@Directive({
  selector: '[bsSwipeContainer]',
  exportAs: 'bsSwipeContainer'
})
export class BsSwipeContainerDirective implements AfterViewInit {

  constructor(element: ElementRef, private animationBuilder: AnimationBuilder, @Inject(DOCUMENT) document: any) {
    this.containerElement = element;
    this.document = <Document>document;

    this.actualSwipes$ = this.swipes$
      .pipe(map(swipes => {
        if (swipes) {
          return swipes.filter(swipe => !swipe.offside);
        } else {
          return [];
        }
      }));

    // const t = this.swipes$.pipe(switchMap((swipes) => {
    //   if (!swipes) {
    //     return of([]);
    //   }

    //   return combineLatest(swipes.map(s => s.slideHeight$.asObservable()));
    // }));

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

    this.offset$ = combineLatest([this.startTouch$, this.lastTouch$, this.orientation$, this.imageIndex$, this.isViewInited$])
      .pipe(switchMap(([startTouch, lastTouch, orientation, imageIndex, isViewInited]) => {
        if (orientation === 'horizontal') {
          if (!isViewInited) {
            return of(-imageIndex * 100);
          } else if (!!startTouch && !!lastTouch) {
            return of(-imageIndex * 100 + (lastTouch.position.x - startTouch.position.x) / this.containerElement.nativeElement.clientWidth * 100);
          } else {
            return of(-imageIndex * 100);
          }
        } else {
          if (!isViewInited) {
            return of(0);
          } else if (!this.swipes$.value) {
            return of(0);
          } else if (!!startTouch && !!lastTouch) {
            return this.actualSwipes$.pipe(switchMap((actualSwipes, i) => {
              return combineLatest(actualSwipes.map((s, i) => (i < imageIndex) ? s.slideHeight$ : of(0)))
                .pipe(map(heights => heights.reduce((haystack, needle) => haystack + needle, 0)))
                .pipe(map(total => total + (lastTouch.position.y - startTouch.position.y)));
                // .pipe(map(total => -total));
            }));
          } else {
            return this.actualSwipes$.pipe(switchMap((actualSwipes, i) => {
              return combineLatest(actualSwipes.map((s, i) => (i < imageIndex) ? s.slideHeight$ : of(0)))
                .pipe(map(heights => heights.reduce((haystack, needle) => haystack + needle, 0)))
                .pipe(map(total => -total));
            }));
          }
        }
      }));

    // Width of the swipes that are offside
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
      return count * 100;
    }));

    // Width of the swipes that are offside
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
      return count * 100;
    }));

    // this.padTop$ = this.swipes$.pipe(map(swipes => {
    //   if (!swipes) {
    //     return 0;
    //   }

    //   let countHeight = 0;
    //   for (const s of swipes) {
    //     if (!s.offside) {
    //       break;
    //     } else {
    //       countHeight += s.slideHeight$.value;
    //     }
    //   }
    //   return -countHeight;
    // }));

    this.padTop$ = this.swipes$.pipe(map(swipes => {
      if (!swipes) {
        return [];
      }

      const list: BehaviorSubject<number>[] = [];
      for (const s of swipes) {
        if (!s.offside) {
          break;
        } else {
          list.push(s.slideHeight$);
        }
      }
      return list;
    })).pipe(switchMap((obs) => {
      return combineLatest(obs).pipe(map((nums) => nums.reduce((haystack, needle) => haystack + needle)), map(sum => -sum));
    }));

    this.padBottom$ = this.swipes$.pipe(delay(50), map(swipes => {
      if (!swipes) {
        return [];
      }

      const list: BehaviorSubject<number>[] = [];
      for (const s of swipes.toArray().reverse()) {
        if (!s.offside) {
          break;
        } else {
          list.push(s.slideHeight$);
        }
      }
      return list;


      // let countHeight = 0;
      // for (const s of swipes.toArray().reverse()) {
      //   if (!s.offside) {
      //     break;
      //   } else {
      //     countHeight += s.slideHeight$.value;
      //   }
      // }
      // return -countHeight;
    })).pipe(switchMap((obs) => {
      return combineLatest(obs).pipe(map((nums) => nums.reduce((haystack, needle) => haystack + needle)), map(sum => -sum));
    }));

    this.offsetLeft$ = combineLatest([this.orientation$, this.offset$, this.padLeft$])
      .pipe(map(([orientation, offset, padLeft]) => {
        if (orientation === 'vertical') {
          return 0;
        } else {
          return offset - padLeft;
        }
      }));
    this.offsetRight$ = combineLatest([this.orientation$, this.offset$, this.padLeft$, this.padRight$])
      .pipe(map(([orientation, offset, padLeft, padRight]) => {
        if (orientation === 'vertical') {
          return 0;
        } else {
          return -(offset - padLeft) - (padRight - 100);
        }
      }));
    this.offsetTop$ = combineLatest([this.orientation$, this.offset$, this.padTop$])
      .pipe(delay(5), map(([orientation, offset, padTop]) => {
        if (orientation === 'horizontal') {
          return 0;
        } else {
          // return (offset + padTop);
          return (offset - padTop);
        }
      }));
    this.offsetBottom$ = combineLatest([this.orientation$, this.offset$, this.padTop$, this.padBottom$, this.currentSlideHeight$])
      .pipe(map(([orientation, offset, padTop, padBottom, currentSlideHeight]) => {
        if (orientation === 'horizontal') {
          return 0;
        } else {
          return -(offset - padTop) - (padBottom - currentSlideHeight);
        }
      }));

    this.offsetLeft$.pipe(takeUntilDestroyed())
      .subscribe(offsetLeft => this.offsetLeft = offsetLeft);
    this.offsetRight$.pipe(takeUntilDestroyed())
      .subscribe(offsetRight => this.offsetRight = offsetRight);
    this.offsetTop$.pipe(takeUntilDestroyed())
      .subscribe(offsetTop => this.offsetTop = offsetTop);
    this.offsetBottom$.pipe(takeUntilDestroyed())
      .subscribe(offsetBottom => this.offsetBottom = offsetBottom);
    this.imageIndex$.pipe(takeUntilDestroyed())
      .subscribe(imageIndex => this.imageIndexChange.emit(imageIndex));
  }

  @HostBinding('style.margin-left.%') offsetLeft: number | null = null;
  @HostBinding('style.margin-right.%') offsetRight: number | null = null;
  @HostBinding('style.margin-top.px') offsetTop: number | null = null;
  @HostBinding('style.margin-bottom.px') offsetBottom: number | null = null;
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
  //#region Orientation
  public get orientation() {
    return this.orientation$.value;
  }
  @Input() public set orientation(value: Orientation) {
    this.orientation$.next(value);
  }
  //#endregion
  
  /** Holds all the swipes, including the offside. */
  swipes$ = new BehaviorSubject<QueryList<BsSwipeDirective> | null>(null);

  /** Swipes that are not offside. */
  actualSwipes$: Observable<BsSwipeDirective[]>;
  isViewInited$ = new BehaviorSubject<boolean>(false);
  startTouch$ = new BehaviorSubject<StartTouch | null>(null);
  lastTouch$ = new BehaviorSubject<LastTouch | null>(null);
  imageIndex$ = new BehaviorSubject<number>(0);
  orientation$ = new BehaviorSubject<Orientation>('horizontal');
  slideHeights$: Observable<number[]>;
  currentSlideHeight$: Observable<number>;
  pendingAnimation?: AnimationPlayer;
  containerElement: ElementRef<HTMLDivElement>;
  document: Document;

  /**
   * Holds the offset of the swipes, without offside swipes.
   * Horizontal => % // Vertical => px
   **/
  offset$: Observable<number>;

  /** Holds the width of the offside slides at the start. */
  padLeft$: Observable<number>;

  /** Holds the width of the offside slides at the end. */
  padRight$: Observable<number>;

  /** Holds the height of the offside slides at the start. */
  padTop$: Observable<number>;

  /** Holds the height of the offside slides at the end. */
  padBottom$: Observable<number>;

  /** Holds the total `margin-left` in % */
  offsetLeft$: Observable<number>;

  /** Holds the total `margin-right` in % */
  offsetRight$: Observable<number>;

  /** Holds the total `margin-top` in px */
  offsetTop$: Observable<number>;

  /** Holds the total `margin-bottom` in px */
  offsetBottom$: Observable<number>;

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  animateToIndexByDxy(dxy: number, orientation: Orientation) {
    combineLatest([this.imageIndex$, this.actualSwipes$]).pipe(take(1))
      .subscribe(([imageIndex, actualSwipes]) => {
        const direction = dxy > 0 ? 'back' : 'forward';
      
        let newIndex: number;
        if (Math.abs(dxy) < this.minimumOffset) {
          newIndex = imageIndex;
        } else {
          newIndex = imageIndex + (direction === 'forward' ? 1 : -1);
        }
  
        this.animateToIndex(imageIndex, newIndex, dxy, orientation, actualSwipes);
      });
  }

  animateToIndex(oldIndex: number, newIndex: number, dxy: number, orientation: Orientation, actualSwipes: BsSwipeDirective[]) {
    // if (orientation === 'horizontal') {
    //   const start = (oldIndex + 1) * this.containerElement.nativeElement.clientWidth - dxy;
    //   const end = (newIndex + 1) * this.containerElement.nativeElement.clientWidth;
    //   this.pendingAnimation = this.animationBuilder.build([
    //     style({ 'margin-left': -start + 'px', 'margin-right': start + 'px' }),
    //     animate('500ms ease', style({ 'margin-left': -end + 'px', 'margin-right': end + 'px' })),
    //   ]).create(this.containerElement.nativeElement);
    // } else {
    //   // Don't forget the last slide's height
    //   const start = actualSwipes.map((s, i) => (i < oldIndex) ? s.slideHeight$.value : 0)
    //     .reduce((haystack, needle) => haystack + needle, 0)
    //     + actualSwipes[actualSwipes.length - 1].slideHeight$.value + dxy;

    //   const end = actualSwipes.map((s, i) => (i < newIndex) ? s.slideHeight$.value : 0)
    //     .reduce((haystack, needle) => haystack + needle, 0)
    //     + actualSwipes[actualSwipes.length - 1].slideHeight$.value;

    //   this.pendingAnimation = this.animationBuilder.build([
    //     style({ 'margin-top': -start + 'px', 'margin-bottom': start + 'px' }),
    //     animate('500ms ease', style({ 'margin-top': -end + 'px', 'margin-bottom': end + 'px' })),
    //   ]).create(this.containerElement.nativeElement);
    // }

    // this.pendingAnimation.onDone(() => {
    //   // Correct the image index
      if (newIndex === -1) {
        this.imageIndex$.next(actualSwipes.length - 1);
      } else if (newIndex === actualSwipes.length) {
        this.imageIndex$.next(0);
      } else {
        this.imageIndex$.next(newIndex);
      }
      this.startTouch$.next(null);
      this.lastTouch$.next(null);
    //   this.pendingAnimation?.destroy();
    //   this.pendingAnimation = undefined;
    // });
    // this.pendingAnimation.play();
  }

  onSwipe(dxy: number, orientation: Orientation) {
    this.animateToIndexByDxy(dxy, orientation);
  }

  previous() {
    this.pendingAnimation?.finish();
    combineLatest([this.actualSwipes$, this.imageIndex$, this.orientation$]).pipe(take(1)).subscribe(([actualSwipes, imageIndex, orientation]) => {
      setTimeout(() => this.animateToIndex(imageIndex, imageIndex - 1, 0, orientation, actualSwipes), 20);
    });
  }

  next() {
    this.pendingAnimation?.finish();
    combineLatest([this.actualSwipes$, this.imageIndex$, this.orientation$]).pipe(take(1)).subscribe(([actualSwipes, imageIndex, orientation]) => {
      setTimeout(() => this.animateToIndex(imageIndex, imageIndex + 1, 0, orientation, actualSwipes), 20);
    });
  }

  goto(index: number) {
    combineLatest([this.actualSwipes$, this.imageIndex$, this.orientation$]).pipe(take(1)).subscribe(([actualSwipes, imageIndex, orientation]) => {
      this.pendingAnimation?.finish();
      setTimeout(() => this.animateToIndex(imageIndex, index, 0, orientation, actualSwipes), 20);
    });
  }

}
