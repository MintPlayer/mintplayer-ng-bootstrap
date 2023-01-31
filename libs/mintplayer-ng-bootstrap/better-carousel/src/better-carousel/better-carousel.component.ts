import { isPlatformServer } from '@angular/common';
import { Component, ContentChildren, Inject, Input, PLATFORM_ID, QueryList } from '@angular/core';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Component({
  selector: 'bs-better-carousel',
  templateUrl: './better-carousel.component.html',
  styleUrls: ['./better-carousel.component.scss'],
})
export class BsBetterCarouselComponent {
  constructor(@Inject(PLATFORM_ID) platformId: any) {
    this.isServerSide = isPlatformServer(platformId);
  }

  @ContentChildren(BsCarouselImageDirective) images!: QueryList<BsCarouselImageDirective>;
  
  isServerSide: boolean;
  currentIndex = 0;
  @Input() indicators = false;
}
