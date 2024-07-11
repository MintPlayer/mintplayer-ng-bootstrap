import { NgModule } from '@angular/core';
import { BsSwiperModule } from '@mintplayer/ng-swiper/swiper';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsCarouselComponent } from './carousel/carousel.component';
import { BsCarouselImageDirective } from './carousel-image/carousel-image.directive';
import { BsCarouselImgDirective } from './carousel-img/carousel-img.directive';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';

@NgModule({
  declarations: [
    BsCarouselComponent,
    BsCarouselImageDirective,
    BsCarouselImgDirective,
  ],
  imports: [
    AsyncPipe,
    NgTemplateOutlet,
    BsSwiperModule,
    BsNoNoscriptDirective
  ],
  exports: [
    BsCarouselComponent,
    BsCarouselImageDirective,
    BsCarouselImgDirective,
  ]
})
export class BsCarouselModule { }
