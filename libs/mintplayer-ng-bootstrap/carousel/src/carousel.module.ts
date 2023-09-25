import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSwiperModule } from '@mintplayer/ng-swiper';
import { BsLetModule } from '@mintplayer/ng-bootstrap/let';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsNoNoscriptModule } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsCarouselComponent } from './carousel/carousel.component';
import { BsCarouselImageDirective } from './carousel-image/carousel-image.directive';
import { BsCarouselImgDirective } from './carousel-img/carousel-img.directive';

@NgModule({
  declarations: [
    BsCarouselComponent,
    BsCarouselImageDirective,
    BsCarouselImgDirective,
  ],
  imports: [
    CommonModule,
    BsLetModule,
    BsSwiperModule,
    BsTrackByModule,
    BsNoNoscriptModule
  ],
  exports: [
    BsCarouselComponent,
    BsCarouselImageDirective,
    BsCarouselImgDirective,
  ]
})
export class BsCarouselModule { }
