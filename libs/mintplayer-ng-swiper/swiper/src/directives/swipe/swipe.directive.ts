import { Directive, effect, HostBinding, HostListener, inject, input } from "@angular/core";
import { BsObserveSizeDirective } from "@mintplayer/ng-swiper/observe-size";
import { BsSwipeContainerDirective } from "../swipe-container/swipe-container.directive";

@Directive({
  selector: '[bsSwipe]',
  hostDirectives: [BsObserveSizeDirective],
  standalone: true,
})
export class BsSwipeDirective {
  private container = inject(BsSwipeContainerDirective);
  observeSize = inject(BsObserveSizeDirective);

  public offside = input(false);

  // Track if we've detected a swipe (vs a tap)
  private isSwipeDetected = false;
  private readonly SWIPE_THRESHOLD = 10; // pixels

  private orientationEffect = effect(() => {
    const orientation = this.container.orientation();
    this.inlineBlock = (orientation === 'horizontal');
    this.block = (orientation === 'vertical');
    // Tell browser which axis we handle, allowing scroll on the other axis
    // pan-y = allow vertical scroll, we handle horizontal swipes
    // pan-x = allow horizontal scroll, we handle vertical swipes
    this.touchAction = (orientation === 'horizontal') ? 'pan-y' : 'pan-x';
  });

  private heightEffect = effect(() => {
    const maxHeight = this.container.maxSlideHeight();
    const orientation = this.container.orientation();
    // Only set height when we have valid measurements (> 10px threshold)
    // to avoid circular dependency during initial load
    const targetHeight = (orientation === 'vertical' && maxHeight > 10) ? maxHeight : null;
    this.slideHeight = targetHeight;
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
  @HostBinding('style.touch-action') touchAction: 'pan-x' | 'pan-y' = 'pan-y';

  @HostListener('touchstart', ['$event'])
  onTouchStart(ev: TouchEvent) {
    if (ev.touches.length === 1) {
      ev.stopPropagation(); // Prevent bubbling, but allow clicks
      this.isSwipeDetected = false;
      this.container.pendingAnimation?.finish();

      setTimeout(() => {
        this.container.startTouch.set({
          position: {
            x: ev.touches[0].clientX,
            y: ev.touches[0].clientY,
          },
          timestamp: Date.now(),
        });
        this.container.lastTouch.set({
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
    ev.stopPropagation();

    // Only prevent default (page scroll) if movement exceeds threshold
    const startTouch = this.container.startTouch();
    if (startTouch) {
      const dx = Math.abs(ev.touches[0].clientX - startTouch.position.x);
      const dy = Math.abs(ev.touches[0].clientY - startTouch.position.y);
      if (dx > this.SWIPE_THRESHOLD || dy > this.SWIPE_THRESHOLD) {
        this.isSwipeDetected = true;
        ev.preventDefault(); // Now we're swiping, prevent scroll
      }
    }

    this.container.lastTouch.set({
      position: {
        x: ev.touches[0].clientX,
        y: ev.touches[0].clientY,
      },
      isTouching: true,
    });
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(ev: TouchEvent) {
    ev.stopPropagation();
    if (this.isSwipeDetected) {
      ev.preventDefault();
    }

    const startTouch = this.container.startTouch();
    const lastTouch = this.container.lastTouch();
    const orientation = this.container.orientation();

    if (!!startTouch && !!lastTouch) {
      const distance = (orientation === 'horizontal')
        ? lastTouch.position.x - startTouch.position.x
        : lastTouch.position.y - startTouch.position.y;
      this.container.onSwipe(distance);
    }
  }

}
