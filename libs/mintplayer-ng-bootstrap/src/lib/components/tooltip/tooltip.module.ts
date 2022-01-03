import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTooltipDirective } from './directive/tooltip.directive';
import { BsTooltipComponent } from './component/tooltip.component';

@NgModule({
  declarations: [
    BsTooltipDirective,
    BsTooltipComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsTooltipDirective,
    BsTooltipComponent
  ],
  entryComponents: [
    BsTooltipComponent
  ]
})
export class BsTooltipModule { }
