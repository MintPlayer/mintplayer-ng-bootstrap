import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, map, Observable, Subject } from 'rxjs';

@Component({
  selector: 'demo-swiper',
  templateUrl: './swiper.component.html',
  styleUrls: ['./swiper.component.scss']
})
export class SwiperComponent implements OnInit, OnDestroy {

  constructor() {
    this.imageData$ = this.images$
      .pipe(map((images) => images.map(image => <ImageData>{
        url: image,
        marginLeft: undefined
      })));
  }

  imageIndex$ = new BehaviorSubject<number>(0);
  isSwiping$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();

  images$ = new BehaviorSubject<string[]>([
    '/assets/resized/deer.png',
    '/assets/resized/duck.png',
    '/assets/resized/leopard.png',
    '/assets/resized/lion.png',
    '/assets/resized/peacock.png',
    '/assets/resized/tiger.png',
  ]);

  imageData$: Observable<ImageData[]>;

  ngOnInit() {
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }
  
  onSwipeStart = () => {
    this.isSwiping$.next(true);
  }

  onSwipeEnd = () =>  {
    this.isSwiping$.next(false);
    this.imageIndex$.next(this.imageIndex$.value + 1);
    return false;
  }

}

export interface ImageData {
  url: string;
  marginLeft: number | undefined;
}