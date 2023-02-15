import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsCarouselModule } from '@mintplayer/ng-bootstrap/carousel';

import { SwiperRoutingModule } from './swiper-routing.module';
import { SwiperComponent } from './swiper.component';


@NgModule({
  declarations: [
    SwiperComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsAlertModule,
    BsCarouselModule,
    SwiperRoutingModule
  ]
})
export class SwiperModule { }
