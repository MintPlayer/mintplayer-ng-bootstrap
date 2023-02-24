import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBoxResizeDirective } from './box-resize.directive';

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
