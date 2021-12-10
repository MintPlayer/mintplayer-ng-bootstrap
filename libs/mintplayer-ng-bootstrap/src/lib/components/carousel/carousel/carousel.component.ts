import { AfterContentInit, Component, ContentChildren, ElementRef, OnDestroy, OnInit, QueryList } from '@angular/core';
import { FadeInOutAnimation, CarouselSlideAnimation } from '@mintplayer/ng-animations';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  animations: [FadeInOutAnimation, CarouselSlideAnimation]
})
export class BsCarouselComponent implements OnInit, OnDestroy, AfterContentInit {

  constructor() {
    this.currentImage$ = this.currentImageIndex$
      .pipe(map((index) => this.images.get(index) ?? null))
      .pipe(takeUntil(this.destroyed$));
  }

  ngOnInit(): void { }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  ngAfterContentInit() {
    if (this.images.length > 0) {
      this.currentImageIndex$.next(0);
    } else {
      this.currentImageIndex$.next(-1);
    }
  }

  destroyed$ = new Subject();
  currentImageIndex$ = new BehaviorSubject<number>(-1);
  currentImage$: Observable<ElementRef<HTMLImageElement> | null>;

  previousImage() {
    this.currentImageIndex$
      .pipe(take(1))
      .subscribe((currentImageIndex) => {
        if (currentImageIndex === 0) {
          this.currentImageIndex$.next(this.images.length - 1);
        } else {
          this.currentImageIndex$.next(currentImageIndex - 1);
        }
      });
  }

  nextImage() {
    this.currentImageIndex$
      .pipe(take(1))
      .subscribe((currentImageIndex) => {
        if (currentImageIndex >= this.images.length - 1) {
          this.currentImageIndex$.next(0);
        } else {
          this.currentImageIndex$.next(currentImageIndex + 1);
        }
      });
  }

  setCurrentImage(index: number) {
    this.currentImageIndex$.next(index);
  }

  @ContentChildren(BsCarouselImageDirective, { read: ElementRef }) images!: QueryList<ElementRef<HTMLImageElement>>;

}
