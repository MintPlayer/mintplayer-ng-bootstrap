import { animate, AnimationBuilder, style } from '@angular/animations';
import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';
import { Point } from '../../interfaces/point';
import { Direction } from '../../types/direction';

@Directive({
  selector: '[swipe]'
})
export class SwipeDirective {

  constructor(private element: ElementRef, private animationBuilder: AnimationBuilder) {
  }

  start: Point | null = null;
  @HostBinding('style.margin-left.px') offsetLeft: number | null = null;
  @HostBinding('style.margin-right.px') offsetRight: number | null = null;
  @HostBinding('style.margin-top.px') offsetTop: number | null = null;
  @HostBinding('style.margin-bottom.px') offsetBottom: number | null = null;

  @Input() public correctRight = true;

  private get offsetX() {
    return this.offsetRight;
  }
  private set offsetX(value: number | null) {
    if (value) {
      this.offsetLeft = -value;
      this.offsetRight = this.correctRight ? value : 0;
    } else {
      this.offsetLeft = null;
      this.offsetRight = null;
    }
  }

  private get offsetY() {
    return this.offsetBottom;
  }
  private set offsetY(value: number | null) {
    if (value) {
      this.offsetTop = -value;
      this.offsetBottom = value;
    } else {
      this.offsetTop = null;
      this.offsetBottom = null;
    }
  }

  @Input() public easeOut = true;
  @Input() public allowedDirections: Direction[] = [];

  @Input() public swipeStart: (() => void) | null = null;
  @Input() public swipeEnd: (() => boolean) | null = null;

  @HostListener('touchstart', ['$event']) onTouchStart(ev: TouchEvent) {
    if (ev.touches.length === 1) {
      ev.preventDefault();
      this.start = {
        x: ev.touches[0].clientX,
        y: ev.touches[0].clientY
      };

      if (this.swipeStart) {
        this.swipeStart();
      }
    }
  }
  
  @HostListener('touchmove', ['$event']) onTouchMove(ev: TouchEvent) {
    if (this.start) {
      ev.preventDefault();

      let offsetX = this.start.x - ev.touches[0].clientX;
      if (!this.allowedDirections.includes('left') && (offsetX < 0)) {
        offsetX = 0;
      }
      if (!this.allowedDirections.includes('right') && (offsetX > 0)) {
        offsetX = 0;
      }
      this.offsetX = offsetX;

      let offsetY = this.start.y - ev.touches[0].clientY;
      if (!this.allowedDirections.includes('up') && (offsetY < 0)) {
        offsetY = 0;
      }
      if (!this.allowedDirections.includes('down') && (offsetY > 0)) {
        offsetY = 0;
      }
      this.offsetY = offsetY;
    }
  }

  @HostListener('touchend', ['$event']) onTouchEnd(ev: TouchEvent) {
    if (this.start) {
      ev.preventDefault();
      this.start = null;

      if (this.swipeEnd && this.swipeEnd()) {
        console.log('swipeEnd handled');
        this.offsetX = this.offsetY = null;
      } else {
        if (this.easeOut) {
          const animation = this.animationBuilder.build([
            style({
              'margin-left': this.offsetLeft + 'px',
              'margin-right': this.offsetRight + 'px',
              'margin-top': this.offsetTop + 'px',
              'margin-bottom': this.offsetBottom + 'px',
            }),
            animate('100ms', style({
              'margin-left': 0,
              'margin-right': 0,
              'margin-top': 0,
              'margin-bottom': 0,
            }))
          ]);
          const player = animation.create(this.element.nativeElement);
          player.onDone(() => {
            this.offsetX = 0;
            this.offsetY = 0;
            player.destroy();
          });
          player.play();
        } else {
          this.offsetX = 0;
          this.offsetY = 0;
        }
      }
    }
  }

}
