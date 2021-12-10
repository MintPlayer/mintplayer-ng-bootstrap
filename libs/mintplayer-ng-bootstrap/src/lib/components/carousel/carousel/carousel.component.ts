import { AfterContentInit, Component, ContentChildren, ElementRef, OnInit, QueryList } from '@angular/core';
import { FadeInOutAnimation, CarouselSlideAnimation } from '@mintplayer/ng-animations';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  animations: [FadeInOutAnimation, CarouselSlideAnimation]
})
export class BsCarouselComponent implements OnInit, AfterContentInit {

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterContentInit() {
    const first = this.images.get(0);
    if (!!first) {
      this.startAnimation(first.nativeElement);
    } else {
      this.startAnimation(null);
    }
  }

  previousImage() {
    const currentIndex = this.images.map(i => i.nativeElement).findIndex(i => i === this.currentImage);
    if (currentIndex === 0) {
      this.startAnimation(this.images.last.nativeElement);
    } else {
      const prev = this.images.get(currentIndex - 1);
      if (!prev) {
      this.startAnimation(null);
      } else {
        this.startAnimation(prev.nativeElement);
      }
    }
  }

  nextImage() {
    const currentIndex = this.images.map(i => i.nativeElement).findIndex(im => im === this.currentImage);
    if (currentIndex >= this.images.length - 1) {
        this.startAnimation(this.images.first.nativeElement);
    } else {
      const next = this.images.get(currentIndex + 1);
      if (!next) {
        this.startAnimation(null);
      } else {
        this.startAnimation(next.nativeElement);
      }
    }
  }

  setCurrentImage(index: number) {
    const image = this.images.get(index);
    if (!image) {
      this.startAnimation(this.images.get(0)?.nativeElement ?? null);
    } else {
      this.startAnimation(image.nativeElement);
    }
  }

  startAnimation(image: HTMLImageElement | null) {
    const previousImage = this.currentImage;
    this.currentImage = image;

    if (image) {
      this.shownImages.push(image);
    }

    // setTimeout(() => {
      if (previousImage) {
        this.shownImages.splice(this.shownImages.indexOf(previousImage), 1);
      }
    // }, 1000);
  }

  @ContentChildren(BsCarouselImageDirective, { read: ElementRef }) images!: QueryList<ElementRef<HTMLImageElement>>;
  currentImage: HTMLImageElement | null = null;
  shownImages: HTMLImageElement[] = [];

}
