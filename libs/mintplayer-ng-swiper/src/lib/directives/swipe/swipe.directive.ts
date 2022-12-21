import { animate, AnimationBuilder, style } from '@angular/animations';
import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, take, takeUntil } from 'rxjs';
import { Point } from '../../interfaces/point';
import { Direction } from '../../types/direction';

@Directive({
  selector: '[swipe]'
})
export class SwipeDirective implements OnDestroy {

  constructor(private element: ElementRef, private animationBuilder: AnimationBuilder) {
    this.offsetX$.pipe(takeUntil(this.destroyed$)).subscribe((offsetX) => {
      this.offsetXChange.emit(offsetX);
      if (!offsetX) {
        this.offsetLeft = null;
        this.offsetRight = null;
      } else {
        if (offsetX > 0) {
          this.offsetLeft = -offsetX;
          this.offsetRight = this.correctRight ? offsetX : 0;
        } else {
          this.offsetLeft = -offsetX;
          this.offsetRight = offsetX;
        }
      }
    });
    this.offsetY$.pipe(takeUntil(this.destroyed$)).subscribe((offsetY) => {
      this.offsetYChange.emit(offsetY);
      if (offsetY) {
        this.offsetTop = -offsetY;
        this.offsetBottom = offsetY;
      } else {
        this.offsetTop = null;
        this.offsetBottom = null;
      }
    });
  }

  start: { position: Point, timestamp: number } | null = null;
  @HostBinding('style.margin-left.px') offsetLeft: number | null = null;
  @HostBinding('style.margin-right.px') offsetRight: number | null = null;
  @HostBinding('style.margin-top.px') offsetTop: number | null = null;
  @HostBinding('style.margin-bottom.px') offsetBottom: number | null = null;

  @Input() public correctRight = true;

  offsetX$ = new BehaviorSubject<number | null>(null);
  offsetY$ = new BehaviorSubject<number | null>(null);
  lastTouch$ = new BehaviorSubject<{ position: Point, isTouching: boolean } | null>(null);
  destroyed$ = new Subject();

  //#region OffsetX
  @Output() offsetXChange = new EventEmitter<number | null>();
  private get offsetX() {
    // return offsetRight
    return this.offsetX$.value;
  }
  private set offsetX(value: number | null) {
    this.offsetX$.next(value);
  }
  //#endregion
  //#region OffsetY
  @Output() offsetYChange = new EventEmitter<number | null>();
  private get offsetY() {
    // return offsetBottom
    return this.offsetY$.value;
  }
  private set offsetY(value: number | null) {
    this.offsetY$.next(value);
  }
  //#endregion

  @Input() public easeOut = true;
  @Input() public allowedDirections: Direction[] = [];

  @Input() public swipeStart: (() => void) | null = null;
  @Input() public swipeEnd: ((offset: Point, durationMs: number) => boolean) | null = null;

  @HostListener('touchstart', ['$event']) onTouchStart(ev: TouchEvent) {
    
    if (ev.touches.length === 1) {
      ev.preventDefault();
      this.start = {
        position: {
          x: ev.touches[0].clientX,
          y: ev.touches[0].clientY
        },
        timestamp: Date.now(),
      };
      this.lastTouch$.next({
        position: {
          x: ev.touches[0].clientX,
          y: ev.touches[0].clientY,
        },
        isTouching: true,
      });

      if (this.swipeStart) {
        this.swipeStart();
      }
    }
  }
  
  @HostListener('touchmove', ['$event']) onTouchMove(ev: TouchEvent) {
    if (this.start) {
      ev.preventDefault();

      let offsetX = this.start.position.x - ev.touches[0].clientX;
      if (!this.allowedDirections.includes('left') && (offsetX < 0)) {
        offsetX = 0;
      }
      if (!this.allowedDirections.includes('right') && (offsetX > 0)) {
        offsetX = 0;
      }
      this.offsetX = offsetX;

      let offsetY = this.start.position.y - ev.touches[0].clientY;
      if (!this.allowedDirections.includes('up') && (offsetY < 0)) {
        offsetY = 0;
      }
      if (!this.allowedDirections.includes('down') && (offsetY > 0)) {
        offsetY = 0;
      }
      this.offsetY = offsetY;

      this.lastTouch$.next({
        position: {
          x: ev.touches[0].clientX,
          y: ev.touches[0].clientY,
        },
        isTouching: true,
      });
    }
  }

  @HostListener('touchend', ['$event']) onTouchEnd(ev: TouchEvent) {
    const lastTouchValue = this.lastTouch$.value;
    if (this.start && lastTouchValue) {
      
      this.lastTouch$.next({
        isTouching: false,
        position: {
          x: lastTouchValue.position.x,
          y: lastTouchValue.position.y,
        }
      });

      ev.preventDefault();
      const startInformation = this.start;
      this.start = null;
      
      const time = Date.now() - startInformation.timestamp;
      const delta = {
        x: lastTouchValue.position.x - startInformation.position.x,
        y: lastTouchValue.position.y - startInformation.position.y,
      };

      if (this.swipeEnd && this.swipeEnd(delta, time)) {
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
  
  ngOnDestroy() {
    this.destroyed$.next(true);
  }

}
