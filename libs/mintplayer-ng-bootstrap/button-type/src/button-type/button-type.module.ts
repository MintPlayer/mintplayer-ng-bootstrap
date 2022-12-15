import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonTypeDirective } from './button-type.directive';

@NgModule({
  declarations: [
    BsButtonTypeDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsButtonTypeDirective
  ]
})
export class BsButtonTypeModule { }
