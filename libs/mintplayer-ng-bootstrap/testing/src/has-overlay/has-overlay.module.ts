import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsHasOverlayMockComponent } from './has-overlay/has-overlay.component';

@NgModule({
  declarations: [BsHasOverlayMockComponent],
  imports: [CommonModule],
  exports: [BsHasOverlayMockComponent],
})
export class BsHasOverlayTestingModule {}
