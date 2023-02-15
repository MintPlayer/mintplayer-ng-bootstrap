import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSwiperModule } from '@mintplayer/ng-swiper';
import { BsNoNoscriptModule } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsCarouselPreviewComponent } from './carousel-preview/carousel.component';
import { BsCarouselPreviewImageDirective } from './carousel-preview-image/carousel-image.directive';

@NgModule({
  declarations: [
    BsCarouselPreviewComponent,
    BsCarouselPreviewImageDirective
  ],
  imports: [
    CommonModule,
    BsSwiperModule,
    BsNoNoscriptModule
  ],
  exports: [
    BsCarouselPreviewComponent,
    BsCarouselPreviewImageDirective
  ]
})
export class BsCarouselPreviewModule { }
