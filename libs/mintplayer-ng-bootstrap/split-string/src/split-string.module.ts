import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSplitStringPipe } from './split-string.pipe';

@NgModule({
  declarations: [BsSplitStringPipe],
  imports: [CommonModule],
  exports: [BsSplitStringPipe]
})
export class BsSplitStringModule {}
