import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsLetDirective } from './directive/let.directive';

@NgModule({
  declarations: [
    BsLetDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsLetDirective
  ]
})
export class BsLetModule { }
