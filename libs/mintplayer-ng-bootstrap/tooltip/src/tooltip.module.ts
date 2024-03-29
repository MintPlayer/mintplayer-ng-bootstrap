import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsTooltipDirective } from './directive/tooltip.directive';
import { BsTooltipComponent } from './component/tooltip.component';

@NgModule({
  declarations: [
    BsTooltipDirective,
    BsTooltipComponent
  ],
  imports: [
    CommonModule,
    OverlayModule,
    BsHasOverlayModule,
  ],
  exports: [
    BsTooltipDirective
  ]
})
export class BsTooltipModule { }
