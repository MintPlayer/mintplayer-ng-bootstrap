import { DestroyRef, Directive, HostBinding, HostListener, input } from "@angular/core";
import { BsObserveSizeDirective } from "@mintplayer/ng-swiper/observe-size";
import { combineLatest, filter, take } from "rxjs";
import { BsSwipeContainerDirective } from "../swipe-container/swipe-container.directive";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Directive({
  selector: '[bsSwipe]',
  hostDirectives: [BsObserveSizeDirective],
  standalone: false,
})
export class BsSwipeDirective {

  constructor(private container: BsSwipeContainerDirective, observeSize: BsObserveSizeDirective, private destroy: DestroyRef) {
    this.observeSize = observeSize;
    this.container.orientation$
      .pipe(takeUntilDestroyed())
      .subscribe(orientation => {
        this.inlineBlock = (orientation === 'horizontal');
        this.block = (orientation === 'vertical');
      });

    combineLatest([this.container.maxSlideHeight$, this.container.orientation$])
      .pipe(takeUntilDestroyed())
      .subscribe(([maxHeight, orientation]) => {
        const targetHeight = (orientation === 'vertical') ? maxHeight : null;
        this.slideHeight = (targetHeight && targetHeight > 0) ? targetHeight : null;
      });
  }

  observeSize: BsObserveSizeDirective;

  public offside = input(false);

  @HostBinding('class.align-top')
  @HostBinding('class.float-none')
  @HostBinding('class.w-100')
  @HostBinding('class.pe-auto')
  @HostBinding('class.me-0')
  classes = true;

  @HostBinding('class.d-inline-block') inlineBlock = true;
  @HostBinding('class.d-block') block = false;
  @HostBinding('style.height.px') slideHeight: number | null = null;

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
    combineLatest([this.container.startTouch$, this.container.lastTouch$, this.container.orientation$])
      .pipe(filter(([startTouch, lastTouch]) => !!startTouch && !!lastTouch))
      .pipe(take(1), takeUntilDestroyed(this.destroy))
      .subscribe(([startTouch, lastTouch, orientation]) => {
        if (!!startTouch && !!lastTouch) {
          const distance = (orientation === 'horizontal')
            ? lastTouch.position.x - startTouch.position.x
            : lastTouch.position.y - startTouch.position.y;
          this.container.onSwipe(distance);
        }
      });
  }

}
