import { NgModule } from '@angular/core';
import { BsSwiperModule } from '@mintplayer/ng-swiper';
import { BsLetDirective } from '@mintplayer/ng-bootstrap/let';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsCarouselComponent } from './carousel/carousel.component';
import { BsCarouselImageDirective } from './carousel-image/carousel-image.directive';
import { BsCarouselImgDirective } from './carousel-img/carousel-img.directive';
import { AsyncPipe, JsonPipe, NgTemplateOutlet } from '@angular/common';
import { BsObserveSizeDirective } from '@mintplayer/ng-bootstrap/observe-size';

@NgModule({
  declarations: [
    BsCarouselComponent,
    BsCarouselImageDirective,
    BsCarouselImgDirective,
  ],
  imports: [
    AsyncPipe,
    JsonPipe,
    NgTemplateOutlet,
    BsLetDirective,
    BsSwiperModule,
    BsNoNoscriptDirective,
    BsObserveSizeDirective
  ],
  exports: [
    BsCarouselComponent,
    BsCarouselImageDirective,
    BsCarouselImgDirective,
  ]
})
export class BsCarouselModule { }
