import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule, BsTooltipModule } from '@mintplayer/ng-bootstrap';

import { TooltipRoutingModule } from './tooltip-routing.module';
import { TooltipComponent } from './tooltip.component';


@NgModule({
  declarations: [
    TooltipComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsTooltipModule,
    TooltipRoutingModule
  ]
})
export class TooltipModule { }
