import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { SwiperModule as LibSwiperModule } from '@mintplayer/ng-swiper';

import { SwiperRoutingModule } from './swiper-routing.module';
import { SwiperComponent } from './swiper.component';


@NgModule({
  declarations: [
    SwiperComponent
  ],
  imports: [
    CommonModule,
    // LibSwiperModule,
    SwiperRoutingModule
  ]
})
export class SwiperModule { }
