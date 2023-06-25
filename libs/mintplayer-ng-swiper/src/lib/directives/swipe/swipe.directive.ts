import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, Input, OnDestroy } from "@angular/core";
import { BehaviorSubject, combineLatest, filter, take } from "rxjs";
import { BsSwipeContainerDirective } from "../swipe-container/swipe-container.directive";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Directive({
  selector: '[bsSwipe]'
})
export class BsSwipeDirective implements AfterViewInit, OnDestroy {

  constructor(private container: BsSwipeContainerDirective, element: ElementRef<HTMLElement>) {
    this.element = element;
    container.orientation$.pipe(takeUntilDestroyed())
      .subscribe((orientation) => {
        this.verticalClasses = orientation === 'vertical';
        this.horizontalClasses = orientation === 'horizontal';
      });
  }

  element: ElementRef<HTMLElement>;
  observer?: ResizeObserver;
  public slideHeight$ = new BehaviorSubject<number>(0);

  //#region Offside
  @Input() public offside = false;
  //#endregion

  @HostBinding('class.align-top')
  @HostBinding('class.float-none')
  @HostBinding('class.w-100')
  @HostBinding('class.pe-auto')
  @HostBinding('class.me-0')
  classes = true;

  @HostBinding('class.d-inline-block')
  horizontalClasses = true;

  @HostBinding('class.d-block')
  verticalClasses = true;

  @HostListener('touchstart', ['$event'])
  onTouchStart(ev: TouchEvent) {
    if (ev.touches.length === 1) {
      ev.preventDefault();
      this.container.pendingAnimation?.finish();

      setTimeout(() => {
        this.container.startTouch$.next({
          position: {
            x: ev.touches[0].clientX,
            y: ev.touches[0].clientY,
          },
          timestamp: Date.now(),
        });
        this.container.lastTouch$.next({
          position: {
            x: ev.touches[0].clientX,
            y: ev.touches[0].clientY,
          },
          isTouching: true,
        });
      }, 20);
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(ev: TouchEvent) {
    this.container.lastTouch$.next({
      position: {
        x: ev.touches[0].clientX,
        y: ev.touches[0].clientY,
      },
      isTouching: true,
    });
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(ev: TouchEvent) {
    combineLatest([this.container.orientation$, this.container.startTouch$, this.container.lastTouch$])
      .pipe(filter(([orientation, startTouch, lastTouch]) => !!startTouch && !!lastTouch))
      .pipe(take(1))
      .subscribe(([orientation, startTouch, lastTouch]) => {
        if (!!startTouch && !!lastTouch) {
          const dxy = orientation === 'horizontal'
            ? lastTouch.position.x - startTouch.position.x
            : lastTouch.position.y - startTouch.position.y;
          this.container.onSwipe(dxy, orientation);
        }
      });
  }

  ngAfterViewInit() {
    this.observer = new ResizeObserver((entries) => {
      this.slideHeight$.next(entries[0].contentRect.height);
    });
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.unobserve(this.element.nativeElement);
      this.observer.disconnect();
    }
  }

}
