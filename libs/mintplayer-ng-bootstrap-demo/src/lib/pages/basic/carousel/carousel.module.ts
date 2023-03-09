import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsCarouselModule } from '@mintplayer/ng-bootstrap/carousel';

import { CarouselRoutingModule } from './carousel-routing.module';
import { CarouselComponent } from './carousel.component';


@NgModule({
  declarations: [
    CarouselComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsGridModule,
    BsSelectModule,
    BsCarouselModule,
    CarouselRoutingModule
  ]
})
export class CarouselModule { }
