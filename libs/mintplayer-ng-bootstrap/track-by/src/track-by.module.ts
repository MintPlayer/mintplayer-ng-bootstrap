import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTrackByDirective } from './track-by.directive';

@NgModule({
  declarations: [BsTrackByDirective],
  imports: [CommonModule],
  exports: [BsTrackByDirective],
})
export class BsTrackByModule {}
