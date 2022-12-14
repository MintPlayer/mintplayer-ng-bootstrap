import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTooltipMockDirective } from './tooltip.directive';

@NgModule({
  declarations: [
    BsTooltipMockDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsTooltipMockDirective
  ]
})
export class BsTooltipTestingModule { }
