import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDockModule } from '@mintplayer/ng-bootstrap/dock';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';

import { DockRoutingModule } from './dock-routing.module';
import { DockComponent } from './dock.component';


@NgModule({
  declarations: [
    DockComponent
  ],
  imports: [
    CommonModule,
    BsDockModule,
    BsGridModule,
    DockRoutingModule
  ]
})
export class DockModule { }
