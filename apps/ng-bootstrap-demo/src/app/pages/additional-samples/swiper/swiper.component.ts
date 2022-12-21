import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Point } from '@mintplayer/ng-swiper';
import { BehaviorSubject, map, Observable, Subject } from 'rxjs';

@Component({
  selector: 'demo-swiper',
  templateUrl: './swiper.component.html',
  styleUrls: ['./swiper.component.scss']
})
export class SwiperComponent implements OnDestroy {

  constructor() {
    this.imageData$ = this.images$
      .pipe(map((images) => images.map(image => <ImageData>{
        url: image,
        marginLeft: undefined
      })));
    this.imageIndex$.subscribe((index) => {
      console.log('image index', index);
    });
  }

  imageIndex$ = new BehaviorSubject<number>(0);
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

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
  
  onSwipeStart = () => {
    this.isSwiping$.next(true);
  }

  onSwipeEnd = (offset: Point, durationMs: number) =>  {
    this.isSwiping$.next(false);
    if (Math.abs(offset.x) >= this.carousel.nativeElement.clientWidth) {
      this.imageIndex$.next(this.imageIndex$.value + 1);
      return true;
    } else {
      return false;
    }
  }

}

export interface ImageData {
  url: string;
  marginLeft: number | undefined;
}