import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTabControlModule } from '@mintplayer/ng-bootstrap';

import { TabControlRoutingModule } from './tab-control-routing.module';
import { TabControlComponent } from './tab-control.component';


@NgModule({
  declarations: [
    TabControlComponent
  ],
  imports: [
    CommonModule,
    BsTabControlModule,
    TabControlRoutingModule
  ]
})
export class TabControlModule { }
