import { Directive, HostBinding, HostListener, Input } from "@angular/core";
import { combineLatest, filter, take } from "rxjs";
import { BsSwipeContainerDirective } from "../swipe-container/swipe-container.directive";
import { BsObserveSizeDirective } from "@mintplayer/ng-swiper/observe-size";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Directive({
  selector: '[bsSwipe]',
  hostDirectives: [BsObserveSizeDirective]
})
export class BsSwipeDirective {

  constructor(private container: BsSwipeContainerDirective, observeSize: BsObserveSizeDirective) {
    this.observeSize = observeSize;
    container.orientation$.pipe(takeUntilDestroyed())
      .subscribe(orientation => this.hostClass = (orientation === 'vertical') ? 'd-block' : 'd-inline-block');
  }

  observeSize: BsObserveSizeDirective;

  //#region Offside
  @Input() public offside = false;
  //#endregion

  @HostBinding('class.align-top')
  @HostBinding('class.float-none')
  @HostBinding('class.w-100')
  @HostBinding('class.pe-auto')
  @HostBinding('class.me-0')
  classes = true;

  @HostBinding('class') hostClass?: string;

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
          const dy = lastTouch.position.y - startTouch.position.y;
          this.container.onSwipe(dx, dy);
        }
      });
  }

}
