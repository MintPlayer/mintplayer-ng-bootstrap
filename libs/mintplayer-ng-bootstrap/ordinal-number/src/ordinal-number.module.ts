import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsOrdinalNumberPipe } from './ordinal-number/ordinal-number.pipe';

@NgModule({
  declarations: [
    BsOrdinalNumberPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsOrdinalNumberPipe
  ]
})
export class BsOrdinalNumberModule { }
