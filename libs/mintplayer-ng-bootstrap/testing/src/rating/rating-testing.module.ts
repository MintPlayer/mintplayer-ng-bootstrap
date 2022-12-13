import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsRatingMockComponent } from './rating/rating.component';

@NgModule({
  declarations: [BsRatingMockComponent],
  imports: [CommonModule],
  exports: [BsRatingMockComponent],
})
export class BsRatingTestingModule {}
