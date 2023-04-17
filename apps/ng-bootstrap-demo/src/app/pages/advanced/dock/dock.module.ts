import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDockModule } from '@mintplayer/ng-bootstrap/dock';
import { BsBadgeModule } from '@mintplayer/ng-bootstrap/badge';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { DockRoutingModule } from './dock-routing.module';
import { DockComponent } from './dock.component';


@NgModule({
  declarations: [
    DockComponent
  ],
  imports: [
    CommonModule,
    BsDockModule,
    BsBadgeModule,
    BsButtonTypeModule,
    DockRoutingModule
  ]
})
export class DockModule { }
