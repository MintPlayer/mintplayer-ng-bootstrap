import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCopyMockDirective } from './copy.directive';

@NgModule({
  declarations: [
    BsCopyMockDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsCopyMockDirective
  ]
})
export class BsCopyTestingModule { }
