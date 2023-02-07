import { AnimationPlayer } from '@angular/animations';
import { AfterViewInit, Directive, ElementRef, EventEmitter, HostBinding, OnDestroy, Output } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, Subject, takeUntil } from 'rxjs';
import { LastTouch } from '../../interfaces/last-touch';
import { StartTouch } from '../../interfaces/start-touch';

@Directive({
  selector: '[bsSwipeContainer]'
})
export class BsSwipeContainerDirective implements AfterViewInit, OnDestroy {

  constructor(element: ElementRef) {
    this.containerElement = element;
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
  }

  // @ContentChildren(BsSwipeDirective) swipes!: QueryList<BsSwipeDirective>;

  @HostBinding('style.margin-left.%') offsetLeft: number | null = null;
  @HostBinding('style.margin-right.%') offsetRight: number | null = null;
  @HostBinding('style.margin-top.%') offsetTop: number | null = null;
  @HostBinding('style.margin-bottom.%') offsetBottom: number | null = null;
  @Output() imageIndexChange = new EventEmitter<number>();

  isViewInited$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();
  startTouch$ = new BehaviorSubject<StartTouch | null>(null);
  lastTouch$ = new BehaviorSubject<LastTouch | null>(null);
  imageIndex$ = new BehaviorSubject<number>(0);
  pendingAnimation?: AnimationPlayer;
  containerElement: ElementRef<HTMLDivElement>;

  offset$: Observable<number>;
  offsetLeft$: Observable<number>;
  offsetRight$: Observable<number>;

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

}
