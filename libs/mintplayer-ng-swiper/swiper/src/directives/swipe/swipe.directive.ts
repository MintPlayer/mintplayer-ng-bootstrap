import { computed, Directive, effect, HostBinding, HostListener, inject, input } from "@angular/core";
import { BsObserveSizeDirective } from "@mintplayer/ng-swiper/observe-size";
import { BsSwipeContainerDirective } from "../swipe-container/swipe-container.directive";

@Directive({
  selector: '[bsSwipe]',
  hostDirectives: [BsObserveSizeDirective],
  standalone: false,
})
export class BsSwipeDirective {
  private container = inject(BsSwipeContainerDirective);
  observeSize = inject(BsObserveSizeDirective);

  public offside = input(false);

  private orientationEffect = effect(() => {
    const orientation = this.container.orientation$();
    this.inlineBlock = (orientation === 'horizontal');
    this.block = (orientation === 'vertical');
  });

  private heightEffect = effect(() => {
    const maxHeight = this.container.maxSlideHeight$();
    const orientation = this.container.orientation$();
    const targetHeight = (orientation === 'vertical') ? maxHeight : null;
    this.slideHeight = (targetHeight && targetHeight > 0) ? targetHeight : null;
  });

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
        this.container.startTouch$.set({
          position: {
            x: ev.touches[0].clientX,
            y: ev.touches[0].clientY,
          },
          timestamp: Date.now(),
        });
        this.container.lastTouch$.set({
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
    this.container.lastTouch$.set({
      position: {
        x: ev.touches[0].clientX,
        y: ev.touches[0].clientY,
      },
      isTouching: true,
    });
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(ev: TouchEvent) {
    const startTouch = this.container.startTouch$();
    const lastTouch = this.container.lastTouch$();
    const orientation = this.container.orientation$();

    if (!!startTouch && !!lastTouch) {
      const distance = (orientation === 'horizontal')
        ? lastTouch.position.x - startTouch.position.x
        : lastTouch.position.y - startTouch.position.y;
      this.container.onSwipe(distance);
    }
  }

}
