import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDockModule } from '@mintplayer/ng-bootstrap/dock';

import { DockRoutingModule } from './dock-routing.module';
import { DockComponent } from './dock.component';


@NgModule({
  declarations: [
    DockComponent
  ],
  imports: [
    CommonModule,
    BsDockModule,
    DockRoutingModule
  ]
})
export class DockModule { }
