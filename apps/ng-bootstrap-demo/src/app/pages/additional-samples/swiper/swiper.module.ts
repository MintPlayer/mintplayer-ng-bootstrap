import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsBadgeModule } from '@mintplayer/ng-bootstrap/badge';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsCarouselPreviewModule } from '@mintplayer/ng-bootstrap/carousel-preview';

import { SwiperRoutingModule } from './swiper-routing.module';
import { SwiperComponent } from './swiper.component';


@NgModule({
  declarations: [
    SwiperComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsGridModule,
    BsBadgeModule,
    BsSelectModule,
    BsCarouselPreviewModule,
    SwiperRoutingModule
  ]
})
export class SwiperModule { }
