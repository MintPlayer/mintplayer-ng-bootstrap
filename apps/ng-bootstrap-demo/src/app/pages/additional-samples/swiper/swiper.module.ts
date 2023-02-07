import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSwiperModule } from '@mintplayer/ng-swiper';

import { SwiperRoutingModule } from './swiper-routing.module';
import { SwiperComponent } from './swiper.component';


@NgModule({
  declarations: [
    SwiperComponent
  ],
  imports: [
    CommonModule,
    BsSwiperModule,
    SwiperRoutingModule
  ]
})
export class SwiperModule { }
