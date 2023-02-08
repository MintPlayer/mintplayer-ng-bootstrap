import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { DOCUMENT } from '@angular/common';
import { AfterContentInit, AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Inject, Input, OnDestroy, Output, QueryList } from '@angular/core';
import { BehaviorSubject, combineLatest, delay, filter, map, Observable, Subject, take, takeUntil } from 'rxjs';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { BsSwipeDirective } from '../swipe/swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  exportAs: 'bsSwipeContainer'
})
export class BsSwipeContainerDirective implements AfterViewInit, AfterContentInit, OnDestroy {

  constructor(element: ElementRef, private animationBuilder: AnimationBuilder, @Inject(DOCUMENT) document: any) {
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
      
    this.offsetLeft$ = this.offset$;
    this.offsetRight$ = this.offset$.pipe(map(o => -o));
    this.offsetLeft$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((offsetLeft) => this.offsetLeft = offsetLeft);
    this.offsetRight$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((offsetRight) => this.offsetRight = offsetRight);
    this.imageIndex$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((imageIndex) => this.imageIndexChange.emit(imageIndex));
    this.slideHeights$ = combineLatest([this.swipes$, this.isContentInited$])
      .pipe(
        filter(([swipes, isContentInited]) => !!swipes && isContentInited),
        delay(50),
        map(([swipes, isContentInited]) => {
          if (!swipes) {
            return [];
          } else {
            const w = this.document.defaultView;
            if (!w) {
              return [];
            }

            return swipes
              .map(s => w.getComputedStyle(s.element.nativeElement).height.slice(0, -2))
              .map(s => parseFloat(s));
          }
        }));
    this.currentSlideHeight$ = combineLatest([this.isContentInited$, this.slideHeights$, this.imageIndex$])
      .pipe(filter(([isContentInited, slideHeights, imageIndex]) => isContentInited))
      .pipe(map(([isContentInited, slideHeights, imageIndex]) => {
        const maxHeight = Math.max(...slideHeights);
        const currHeight = slideHeights[imageIndex] ?? maxHeight;
        return maxHeight - (maxHeight - currHeight)/* / 2*/;
      }));
  }

  @HostBinding('style.margin-left.%') offsetLeft: number | null = null;
  @HostBinding('style.margin-right.%') offsetRight: number | null = null;
  @HostBinding('style.margin-top.%') offsetTop: number | null = null;
  @HostBinding('style.margin-bottom.%') offsetBottom: number | null = null;
  @ContentChildren(forwardRef(() => BsSwipeDirective)) set swipes(value: QueryList<BsSwipeDirective>) {
    this.swipes$.next(value);
  }
  @Input() minimumOffset = 50;
  @Output() imageIndexChange = new EventEmitter<number>();
  
  isViewInited$ = new BehaviorSubject<boolean>(false);
  isContentInited$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();
  startTouch$ = new BehaviorSubject<StartTouch | null>(null);
  lastTouch$ = new BehaviorSubject<LastTouch | null>(null);
  swipes$ = new BehaviorSubject<QueryList<BsSwipeDirective> | null>(null);
  imageIndex$ = new BehaviorSubject<number>(0);
  slideHeights$: Observable<(number)[]>;
  currentSlideHeight$: Observable<number>;
  pendingAnimation?: AnimationPlayer;
  containerElement: ElementRef<HTMLDivElement>;
  document: Document;

  offset$: Observable<number>;
  offsetLeft$: Observable<number>;
  offsetRight$: Observable<number>;

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  ngAfterContentInit() {
    setTimeout(() => this.isContentInited$.next(true), 50);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  animateToIndex(oldIndex: number, dx: number) {
    const direction = dx > 0 ? 'left' : 'right';
    
    let newIndex: number;
    if (Math.abs(dx) < this.minimumOffset) {
      newIndex = oldIndex;
    } else if ((oldIndex === 0) && (direction === 'left')) {
      newIndex = oldIndex;
    } else if ((oldIndex === ((this.swipes$.value?.length ?? 0) - 1)) && (direction === 'right')) {
      newIndex = oldIndex;
    } else {
      newIndex = oldIndex + (direction === 'right' ? 1 : -1);
    }

    this.pendingAnimation = this.animationBuilder.build([
      style({ 'margin-left': (-oldIndex * this.containerElement.nativeElement.clientWidth + dx) + 'px', 'margin-right': (oldIndex * this.containerElement.nativeElement.clientWidth - dx) + 'px' }),
      animate('500ms ease', style({ 'margin-left': (-newIndex * this.containerElement.nativeElement.clientWidth) + 'px', 'margin-right': (newIndex * this.containerElement.nativeElement.clientWidth) + 'px' })),
    ]).create(this.containerElement.nativeElement);
    this.pendingAnimation.onDone(() => {
      this.imageIndex$.next(newIndex);
      this.startTouch$.next(null);
      this.lastTouch$.next(null);
      this.pendingAnimation?.destroy();
      this.pendingAnimation = undefined;
    });
    this.pendingAnimation.play();
  }

  onSwipe(oldIndex: number, dx: number) {
    this.animateToIndex(oldIndex, dx);
  }

  previous() {
    this.pendingAnimation?.finish();
    setTimeout(() => this.animateToIndex(this.imageIndex$.value, this.minimumOffset), 10);
  }

  next() {
    this.pendingAnimation?.finish();
    setTimeout(() => this.animateToIndex(this.imageIndex$.value, -this.minimumOffset), 10);
  }

  goto(index: number) {

  }
}
