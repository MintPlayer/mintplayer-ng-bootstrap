import { computed, DestroyRef, Directive, effect, HostBinding, HostListener, input, Input, signal } from "@angular/core";
import { BsObserveSizeDirective } from "@mintplayer/ng-swiper/observe-size";
import { combineLatest, filter, take } from "rxjs";
import { BsSwipeContainerDirective } from "../swipe-container/swipe-container.directive";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Directive({
  selector: '[bsSwipe]',
  host: {
    'class.align-top': 'true',
    'class.d-inline-block': 'true',
    'class.float-none': 'true',
    'class.w-100': 'true',
    'class.pe-auto': 'true',
    'class.me-0': 'true',
    'class': 'hostClass()',
  },
  hostDirectives: [BsObserveSizeDirective],
  standalone: false,
})
export class BsSwipeDirective {

  constructor(private container: BsSwipeContainerDirective, observeSize: BsObserveSizeDirective, private destroy: DestroyRef) {
    this.observeSize = observeSize;
    // container.orientation$.pipe(takeUntilDestroyed())
    //   .subscribe(orientation => this.hostClass = (orientation === 'vertical') ? 'd-block' : 'd-inline-block');
  }

  observeSize: BsObserveSizeDirective;

  public offside = input(false);

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
      .pipe(take(1), takeUntilDestroyed(this.destroy))
      .subscribe(([startTouch, lastTouch]) => {
        if (!!startTouch && !!lastTouch) {
          const dx = lastTouch.position.x - startTouch.position.x;
          this.container.onSwipe(dx);
        }
      });
  }

}
