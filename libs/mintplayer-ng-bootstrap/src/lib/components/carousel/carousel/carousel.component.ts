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
    this.currentImageIndex$ = this.currentImageCounter$
      .pipe(map((counter) => {
        const l = this.images.length;
        return ((counter % l) + l) % l;
      }))
      .pipe(takeUntil(this.destroyed$));
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
      this.currentImageCounter$.next(0);
    } else {
      this.currentImageCounter$.next(-1);
    }
  }

  destroyed$ = new Subject();
  currentImageCounter$ = new BehaviorSubject<number>(-1);
  currentImageIndex$: Observable<number>;
  currentImage$: Observable<ElementRef<HTMLImageElement> | null>;

  previousImage() {
    this.currentImageCounter$
      .pipe(take(1))
      .subscribe((currentImageCounter) => {
        this.currentImageCounter$.next(currentImageCounter - 1);
      });
  }

  nextImage() {
    this.currentImageCounter$
      .pipe(take(1))
      .subscribe((currentImageCounter) => {
        this.currentImageCounter$.next(currentImageCounter + 1);
      });
  }

  setCurrentImage(index: number) {
    this.currentImageCounter$.next(index);
  }

  @ContentChildren(BsCarouselImageDirective, { read: ElementRef }) images!: QueryList<ElementRef<HTMLImageElement>>;

}
