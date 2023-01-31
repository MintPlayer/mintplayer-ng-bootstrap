import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsBetterCarouselModule } from '@mintplayer/ng-bootstrap/better-carousel';

import { BetterCarouselRoutingModule } from './better-carousel-routing.module';
import { BetterCarouselComponent } from './better-carousel.component';


@NgModule({
  declarations: [
    BetterCarouselComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsGridModule,
    BsSelectModule,
    BsBetterCarouselModule,
    BetterCarouselRoutingModule
  ]
})
export class BetterCarouselModule { }
