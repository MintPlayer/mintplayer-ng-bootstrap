import { Directive, ElementRef, HostBinding, HostListener } from "@angular/core";
import { combineLatest, filter, take } from "rxjs";
import { BsSwipeContainerDirective } from "../swipe-container/swipe-container.directive";

@Directive({
  selector: '[bsSwipe]'
})
export class BsSwipeDirective {

  constructor(private container: BsSwipeContainerDirective, element: ElementRef<HTMLElement>) {
    this.element = element;
  }

  element: ElementRef<HTMLElement>;

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
    combineLatest([this.container.startTouch$, this.container.lastTouch$, this.container.imageIndex$])
      .pipe(filter(([startTouch, lastTouch, imageIndex]) => !!startTouch && !!lastTouch))
      .pipe(take(1))
      .subscribe(([startTouch, lastTouch, imageIndex]) => {
        if (!!startTouch && !!lastTouch) {
          const ml = lastTouch.position.x - startTouch.position.x;
          this.container.onSwipe(imageIndex, ml);
        }
      });
  }

}
