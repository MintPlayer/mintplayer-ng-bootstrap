import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsUcFirstPipe } from './uc-first.pipe';

@NgModule({
  declarations: [
    BsUcFirstPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsUcFirstPipe
  ]
})
export class BsUcFirstModule { }
