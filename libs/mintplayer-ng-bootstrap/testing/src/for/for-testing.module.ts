import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsForMockDirective } from './for.directive';

@NgModule({
  declarations: [
    BsForMockDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsForMockDirective
  ]
})
export class BsForTestingModule { }
