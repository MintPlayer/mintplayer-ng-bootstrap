import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTrackByDirective } from './track-by.directive';
import { BsTrackByIndexDirective } from './track-by-index.directive';

@NgModule({
  declarations: [BsTrackByDirective, BsTrackByIndexDirective],
  imports: [CommonModule],
  exports: [BsTrackByDirective, BsTrackByIndexDirective],
})
export class BsTrackByModule {}
