import { animate, AnimationBuilder, style } from '@angular/animations';
import { Directive, ElementRef, HostBinding, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[swipe]'
})
export class SwipeDirective {

  constructor(private element: ElementRef, private animationBuilder: AnimationBuilder) {
  }

  start: number | null = null;
  @HostBinding('style.margin-left.px') offsetLeft = 0;
  @HostBinding('style.margin-right.px') offsetRight = 0;

  private get offset() {
    return this.offsetRight;
  }
  private set offset(value: number) {
    this.offsetLeft = -value;
    this.offsetRight = value;
  }

  @Input() public easeOut = true;

  @HostListener('touchstart', ['$event']) onTouchStart(ev: TouchEvent) {
    if (ev.touches.length === 1) {
      ev.preventDefault();
      this.start = ev.touches[0].clientX;
    }
  }
  
  @HostListener('touchmove', ['$event']) onTouchMove(ev: TouchEvent) {
    if (this.start) {
      ev.preventDefault();
      this.offset = (this.start - ev.touches[0].clientX);
    }
  }

  @HostListener('touchend', ['$event']) onTouchEnd(ev: TouchEvent) {
    if (this.start) {
      ev.preventDefault();
      this.start = null;

      if (this.easeOut) {
        const animation = this.animationBuilder.build([
          style({ 'margin-left': this.offsetLeft + 'px', 'margin-right': this.offsetRight + 'px' }),
          animate('100ms', style({ 'margin-left': 0, 'margin-right': 0 }))
        ]);
        const player = animation.create(this.element.nativeElement);
        player.onDone(() => {
          this.offset = 0;
          player.destroy();
        });
        player.play();
      } else {
        this.offset = 0;
      }
    }
  }

}
