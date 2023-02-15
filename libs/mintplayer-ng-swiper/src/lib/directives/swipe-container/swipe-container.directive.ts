import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { DOCUMENT } from '@angular/common';
import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Inject, Input, OnDestroy, Output, QueryList } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, map, mergeMap, Observable, Subject, take, takeUntil } from 'rxjs';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';
import { BsSwipeDirective } from '../swipe/swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  exportAs: 'bsSwipeContainer'
})
export class BsSwipeContainerDirective implements AfterViewInit, OnDestroy {

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

    this.slideHeights$ = this.swipes$
      .pipe(filter(swipes => !!swipes))
      .pipe(map(swipes => <QueryList<BsSwipeDirective>>swipes))
      .pipe(mergeMap(swipes => combineLatest(swipes.map(swipe => swipe.slideHeight$))));

    this.currentSlideHeight$ = combineLatest([this.slideHeights$, this.imageIndex$])
      .pipe(map(([slideHeights, imageIndex]) => {
        const maxHeight = Math.max(...slideHeights);
        const currHeight: number = slideHeights[imageIndex] ?? maxHeight;
        return maxHeight - (maxHeight - currHeight)/* / 2*/;
      }));

    this.canPrevious$ = this.imageIndex$.pipe(map((imageIndex) => {
      return (imageIndex > 0);
    }));
    this.canNext$ = combineLatest([this.swipes$, this.imageIndex$])
      .pipe(map(([swipes, imageIndex]) => {
        return imageIndex !== ((swipes?.length ?? 0) - 1);
      }));
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
  
  isViewInited$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();
  startTouch$ = new BehaviorSubject<StartTouch | null>(null);
  lastTouch$ = new BehaviorSubject<LastTouch | null>(null);
  swipes$ = new BehaviorSubject<QueryList<BsSwipeDirective> | null>(null);
  imageIndex$ = new BehaviorSubject<number>(0);
  slideHeights$: Observable<number[]>;
  currentSlideHeight$: Observable<number>;
  canPrevious$: Observable<boolean>;
  canNext$: Observable<boolean>;
  pendingAnimation?: AnimationPlayer;
  containerElement: ElementRef<HTMLDivElement>;
  document: Document;

  offset$: Observable<number>;
  offsetLeft$: Observable<number>;
  offsetRight$: Observable<number>;

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  animateToIndexByDx(dx: number) {
    combineLatest([this.imageIndex$, this.canPrevious$, this.canNext$]).pipe(take(1))
      .subscribe(([imageIndex, canPrevious, canNext]) => {
        const direction = dx > 0 ? 'left' : 'right';
      
        let newIndex: number;
        if (Math.abs(dx) < this.minimumOffset) {
          newIndex = imageIndex;
        } else if (!canPrevious && (direction === 'left')) {
          newIndex = imageIndex;
        } else if (!canNext && (direction === 'right')) {
          newIndex = imageIndex;
        } else {
          newIndex = imageIndex + (direction === 'right' ? 1 : -1);
        }
  
        this.animateToIndex(imageIndex, newIndex, dx);
      });
  }

  animateToIndex(oldIndex: number, newIndex: number, dx: number) {
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

  onSwipe(dx: number) {
    this.animateToIndexByDx(dx);
  }

  previous() {
    this.pendingAnimation?.finish();
    combineLatest([this.canPrevious$, this.imageIndex$]).pipe(take(1)).subscribe(([canPrevious, imageIndex]) => {
      if (canPrevious) {
        setTimeout(() => this.animateToIndex(imageIndex, imageIndex - 1, 0), 20);
      }
    });
  }

  next() {
    this.pendingAnimation?.finish();
    combineLatest([this.canNext$, this.imageIndex$]).pipe(take(1)).subscribe(([canNext, imageIndex]) => {
      if (canNext) {
        setTimeout(() => this.animateToIndex(imageIndex, imageIndex + 1, 0), 20);
      }
    });
  }

  goto(index: number) {
    this.imageIndex$.pipe(take(1)).subscribe((imageIndex) => {
      this.pendingAnimation?.finish();
      setTimeout(() => this.animateToIndex(imageIndex, index, 0), 10);
    });
  }

}
