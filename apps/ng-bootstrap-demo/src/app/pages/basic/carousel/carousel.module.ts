import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsCarouselModule } from '@mintplayer/ng-bootstrap';

import { CarouselRoutingModule } from './carousel-routing.module';
import { CarouselComponent } from './carousel.component';


@NgModule({
  declarations: [
    CarouselComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsCarouselModule,
    CarouselRoutingModule
  ]
})
export class CarouselModule { }
