import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCopyDirective } from './copy.directive';

@NgModule({
  declarations: [
    BsCopyDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsCopyDirective
  ]
})
export class BsCopyModule { }
