import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UcFirstPipe } from './uc-first.pipe';

@NgModule({
  declarations: [
    UcFirstPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    UcFirstPipe
  ]
})
export class BsUcFirstPipeModule { }
