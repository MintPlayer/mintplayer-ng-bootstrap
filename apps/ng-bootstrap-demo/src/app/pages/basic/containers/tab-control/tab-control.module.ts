import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsForModule } from '@mintplayer/ng-bootstrap/for';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsTabControlModule } from '@mintplayer/ng-bootstrap/tab-control';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { TabControlRoutingModule } from './tab-control-routing.module';
import { TabControlComponent } from './tab-control.component';


@NgModule({
  declarations: [
    TabControlComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsForModule,
    BsGridModule,
    BsSelectModule,
    BsTabControlModule,
    BsToggleButtonModule,
    TabControlRoutingModule
  ]
})
export class TabControlModule { }
