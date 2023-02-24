import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBoxResizeDirective } from './directive/box-resize.directive';

@NgModule({
  declarations: [
    BsBoxResizeDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsBoxResizeDirective
  ]
})
export class BsBoxResizeModule { }
