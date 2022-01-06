import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormatBytesPipe } from './format-bytes.pipe';

@NgModule({
  declarations: [
    BsFormatBytesPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsFormatBytesPipe
  ]
})
export class BsFormatBytesModule { }
