import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBadgeModule } from '@mintplayer/ng-bootstrap/badge';
import { BsCarouselPreviewModule } from '@mintplayer/ng-bootstrap/carousel-preview';

import { SwiperRoutingModule } from './swiper-routing.module';
import { SwiperComponent } from './swiper.component';


@NgModule({
  declarations: [
    SwiperComponent
  ],
  imports: [
    CommonModule,
    BsBadgeModule,
    BsCarouselPreviewModule,
    SwiperRoutingModule
  ]
})
export class SwiperModule { }
