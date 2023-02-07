import { animate, AnimationBuilder, style } from "@angular/animations";
import { Directive, HostListener } from "@angular/core";
import { combineLatest, filter, take } from "rxjs";
import { BsSwipeContainerDirective } from "../swipe-container/swipe-container.directive";

@Directive({
  selector: '[bsSwipe]'
})
export class BsSwipeDirective {

  constructor(private container: BsSwipeContainerDirective, private animationBuilder: AnimationBuilder) {}

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
          this.animateToIndex(imageIndex, ml);
        }
      });
  }

  animateToIndex(oldIndex: number, dx: number) {
    const direction = dx > 0 ? 'left' : 'right';
    const newIndex = oldIndex + (direction === 'right' ? 1 : -1);
    this.container.pendingAnimation = this.animationBuilder.build([
      style({ 'margin-left': (-oldIndex * this.container.containerElement.nativeElement.clientWidth + dx) + 'px', 'margin-right': (oldIndex * this.container.containerElement.nativeElement.clientWidth - dx) + 'px' }),
      animate('500ms ease', style({ 'margin-left': (-newIndex * this.container.containerElement.nativeElement.clientWidth) + 'px', 'margin-right': (newIndex * this.container.containerElement.nativeElement.clientWidth) + 'px' })),
    ]).create(this.container.containerElement.nativeElement);
    this.container.pendingAnimation.onDone(() => {
      this.container.imageIndex$.next(newIndex);
      this.container.startTouch$.next(null);
      this.container.lastTouch$.next(null);
      this.container.pendingAnimation?.destroy();
      this.container.pendingAnimation = undefined;
    });
    this.container.pendingAnimation.play();
  }

}
