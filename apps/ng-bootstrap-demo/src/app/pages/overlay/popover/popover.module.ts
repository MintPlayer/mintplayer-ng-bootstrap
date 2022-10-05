import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule, BsPopoverModule } from '@mintplayer/ng-bootstrap';

import { PopoverRoutingModule } from './popover-routing.module';
import { PopoverComponent } from './popover.component';


@NgModule({
  declarations: [
    PopoverComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsPopoverModule,
    PopoverRoutingModule
  ]
})
export class PopoverModule { }
