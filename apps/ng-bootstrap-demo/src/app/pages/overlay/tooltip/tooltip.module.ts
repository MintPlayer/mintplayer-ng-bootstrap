import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTooltipModule } from '@mintplayer/ng-bootstrap/tooltip';

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
