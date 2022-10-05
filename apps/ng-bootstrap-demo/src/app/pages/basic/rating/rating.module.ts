import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule, BsRatingModule } from '@mintplayer/ng-bootstrap';

import { RatingRoutingModule } from './rating-routing.module';
import { RatingComponent } from './rating.component';

@NgModule({
  declarations: [
    RatingComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsRatingModule,
    RatingRoutingModule
  ]
})
export class RatingModule { }
