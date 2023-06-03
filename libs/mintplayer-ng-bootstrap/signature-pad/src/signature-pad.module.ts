import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSignaturePadComponent } from './component/signature-pad.component';

@NgModule({
  declarations: [BsSignaturePadComponent],
  imports: [CommonModule],
  exports: [BsSignaturePadComponent],
})
export class BsSignaturePadModule {}
