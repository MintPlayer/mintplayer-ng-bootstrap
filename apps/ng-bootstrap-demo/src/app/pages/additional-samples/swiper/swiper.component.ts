import { animate, AnimationBuilder, AnimationPlayer, state, style } from '@angular/animations';
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
// import { Point } from '@mintplayer/ng-swiper';
import { BehaviorSubject, combineLatest, filter, map, Observable, Subject, take, takeUntil, tap, delay } from 'rxjs';

export interface Point {
  x: number;
  y: number;
}

export interface StartTouch {
  position: Point;
  timestamp: number;
}

export interface LastTouch {
  position: Point;
  isTouching: boolean;
}

@Component({
  selector: 'demo-swiper',
  templateUrl: './swiper.component.html',
  styleUrls: ['./swiper.component.scss']
})
export class SwiperComponent implements AfterViewInit, OnDestroy {

  constructor(private animationBuilder: AnimationBuilder) {
    this.imageData$ = this.images$
      .pipe(map((images) => images.map(image => <ImageData>{
        url: image,
        // marginLeft: undefined
      })));
    // this.imageIndex$.subscribe((index) => {
    //   console.log('image index', index);
    // });

    combineLatest([this.startTouch$, this.lastTouch$, this.imageIndex$, this.isViewInited$])
      .pipe(filter(([startTouch, lastTouch, imageIndex, isViewInited]) => isViewInited))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([startTouch, lastTouch, imageIndex]) => {
        console.log('startTouch, lastTouch', {startTouch, lastTouch});
        if (!!startTouch && !!lastTouch) {
          this.offset$.next(-imageIndex * this.wrapper.nativeElement.clientWidth + lastTouch.position.x - startTouch.position.x);
        } else {
          this.offset$.next(-imageIndex * this.wrapper.nativeElement.clientWidth);
        }
      });

    this.offsetLeft$ = this.offset$;
    this.offsetRight$ = this.offset$.pipe(map((o) => -o));
  }

  isViewInited$ = new BehaviorSubject<boolean>(false);
  imageIndex$ = new BehaviorSubject<number>(2);
  isSwiping$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();
  offsetX: number | null = null;

  images$ = new BehaviorSubject<string[]>([
    '/assets/resized/deer.png',
    '/assets/resized/duck.png',
    '/assets/resized/leopard.png',
    '/assets/resized/lion.png',
    '/assets/resized/peacock.png',
    '/assets/resized/tiger.png',
  ]);

  imageData$: Observable<ImageData[]>;
  @ViewChild('carousel') carousel!: ElementRef<HTMLDivElement>;
  @ViewChild('wrapper') wrapper!: ElementRef<HTMLDivElement>;
  startTouch$ = new BehaviorSubject<StartTouch | null>(null);
  lastTouch$ = new BehaviorSubject<LastTouch | null>(null);
  currentAnimation?: AnimationPlayer;
  offset$ = new BehaviorSubject<number>(0);
  offsetLeft$: Observable<number>;
  offsetRight$: Observable<number>;

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  onTouchStart(ev: TouchEvent) {
    if (ev.touches.length === 1) {
      ev.preventDefault();
      this.currentAnimation?.finish();

      setTimeout(() => {
        this.startTouch$.next({
          position: {
            x: ev.touches[0].clientX,
            y: ev.touches[0].clientY,
          },
          timestamp: Date.now(),
        });
        this.lastTouch$.next({
          position: {
            x: ev.touches[0].clientX,
            y: ev.touches[0].clientY,
          },
          isTouching: true,
        });
      }, 20);
    }
  }

  onTouchMove(ev: TouchEvent) {
    this.lastTouch$.next({
      position: {
        x: ev.touches[0].clientX,
        y: ev.touches[0].clientY,
      },
      isTouching: true,
    });
  }

  onTouchEnd(ev: TouchEvent) {
    combineLatest([this.startTouch$, this.lastTouch$, this.imageIndex$])
      .pipe(filter(([startTouch, lastTouch, imageIndex]) => !!startTouch && !!lastTouch))
      .pipe(take(1))
      .subscribe(([startTouch, lastTouch, imageIndex]) => {
        if (!!startTouch && !!lastTouch) {
          const ml = lastTouch.position.x - startTouch.position.x;
          const direction = ml > 0 ? 'left' : 'right';


          this.currentAnimation = this.animationBuilder.build([
            style({ 'margin-left': (-imageIndex * this.wrapper.nativeElement.clientWidth + ml) + 'px', 'margin-right': (imageIndex * this.wrapper.nativeElement.clientWidth - ml) + 'px' }),
            animate('500ms ease', style({ 'margin-left': (-(imageIndex + (direction === 'right' ? 1 : -1)) * this.wrapper.nativeElement.clientWidth) + 'px', 'margin-right': ((imageIndex + (direction === 'right' ? 1 : -1)) * this.wrapper.nativeElement.clientWidth) + 'px' }))
          ]).create(this.wrapper.nativeElement);
          this.currentAnimation.onDone(() => {
            switch (direction) {
              case 'left':
                this.imageIndex$.next(imageIndex - 1);
                break;
              case 'right':
                this.imageIndex$.next(imageIndex + 1);
                break;
            }

            this.startTouch$.next(null);
            this.lastTouch$.next(null);
            this.currentAnimation?.destroy();
            this.currentAnimation = undefined;
          });
          this.currentAnimation.play();
          
          // switch (direction) {
          //   case 'left':
          //     this.imageIndex$.next(imageIndex - 1);
          //     break;
          //   case 'right':
          //     this.imageIndex$.next(imageIndex + 1);
          //     break;
          // }
        }
      });
  }
  
  // onSwipeStart = () => {
  //   this.isSwiping$.next(true);
  // }

  // onSwipeEnd = (offset: Point, durationMs: number) =>  {
  //   this.isSwiping$.next(false);
  //   if (Math.abs(offset.x) >= this.carousel.nativeElement.clientWidth / 2) {
  //     this.imageIndex$.next(this.imageIndex$.value + 1);

  //     this.animationBuilder.build([
  //       style({ 'margin-left':  })
  //     ])

  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

}

export interface ImageData {
  url: string;
  marginLeft: number | undefined;
}