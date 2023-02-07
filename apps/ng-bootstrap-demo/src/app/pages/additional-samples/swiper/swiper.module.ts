import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSwiperModule } from '@mintplayer/ng-swiper';
import { BsBadgeModule } from '@mintplayer/ng-bootstrap/badge';

import { SwiperRoutingModule } from './swiper-routing.module';
import { SwiperComponent } from './swiper.component';


@NgModule({
  declarations: [
    SwiperComponent
  ],
  imports: [
    CommonModule,
    BsBadgeModule,
    BsSwiperModule,
    SwiperRoutingModule
  ]
})
export class SwiperModule { }
