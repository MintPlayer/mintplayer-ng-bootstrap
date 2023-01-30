import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBetterCarouselModule } from '@mintplayer/ng-bootstrap/better-carousel';

import { BetterCarouselRoutingModule } from './better-carousel-routing.module';
import { BetterCarouselComponent } from './better-carousel.component';


@NgModule({
  declarations: [
    BetterCarouselComponent
  ],
  imports: [
    CommonModule,
    BsBetterCarouselModule,
    BetterCarouselRoutingModule
  ]
})
export class BetterCarouselModule { }
