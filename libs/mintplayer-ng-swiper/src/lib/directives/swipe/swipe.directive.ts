import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, OnDestroy } from "@angular/core";
import { BehaviorSubject, combineLatest, filter, Subject, take } from "rxjs";
import { BsSwipeContainerDirective } from "../swipe-container/swipe-container.directive";

@Directive({
  selector: '[bsSwipe]'
})
export class BsSwipeDirective implements AfterViewInit, OnDestroy {

  constructor(private container: BsSwipeContainerDirective, element: ElementRef<HTMLElement>) {
    this.element = element;
  }

  element: ElementRef<HTMLElement>;
  observer?: ResizeObserver;
  public slideHeight$ = new BehaviorSubject<number>(0);

  @HostBinding('class.align-top') alignTopClass = true;
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
    combineLatest([this.container.startTouch$, this.container.lastTouch$])
      .pipe(filter(([startTouch, lastTouch]) => !!startTouch && !!lastTouch))
      .pipe(take(1))
      .subscribe(([startTouch, lastTouch]) => {
        if (!!startTouch && !!lastTouch) {
          const dx = lastTouch.position.x - startTouch.position.x;
          this.container.onSwipe(dx);
        }
      });
  }

  ngAfterViewInit() {
    this.observer = new ResizeObserver((entries) => {
      console.log('resized', entries[0].contentRect);
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
