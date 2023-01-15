import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsRatingComponent } from './component/rating.component';



@NgModule({
  declarations: [
    BsRatingComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsRatingComponent
  ]
})
export class BsRatingModule { }
