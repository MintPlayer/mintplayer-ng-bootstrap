import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsLazyLoadDirective } from './lazy-load/lazy-load.directive';



@NgModule({
  declarations: [
    BsLazyLoadDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsLazyLoadDirective
  ]
})
export class BsLazyLoadingModule { }
