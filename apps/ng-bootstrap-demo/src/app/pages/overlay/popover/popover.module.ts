import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsPopoverModule } from '@mintplayer/ng-bootstrap/popover';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

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
    BsButtonTypeModule,
    PopoverRoutingModule
  ]
})
export class PopoverModule { }
