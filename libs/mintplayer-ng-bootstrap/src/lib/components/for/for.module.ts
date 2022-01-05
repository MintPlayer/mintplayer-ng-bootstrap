import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsForDirective } from './for.directive';

@NgModule({
  declarations: [
    BsForDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsForDirective
  ]
})
export class BsForModule { }
