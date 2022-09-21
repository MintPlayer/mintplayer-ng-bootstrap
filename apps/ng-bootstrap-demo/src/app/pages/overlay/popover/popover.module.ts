import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsPopoverModule } from '@mintplayer/ng-bootstrap';

import { PopoverRoutingModule } from './popover-routing.module';
import { PopoverComponent } from './popover.component';


@NgModule({
  declarations: [
    PopoverComponent
  ],
  imports: [
    CommonModule,
    BsPopoverModule,
    PopoverRoutingModule
  ]
})
export class PopoverModule { }
