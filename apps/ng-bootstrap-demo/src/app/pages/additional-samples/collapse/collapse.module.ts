import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAlertModule, BsGridModule } from '@mintplayer/ng-bootstrap';

import { CollapseRoutingModule } from './collapse-routing.module';
import { CollapseComponent } from './collapse.component';


@NgModule({
  declarations: [
    CollapseComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsAlertModule,
    CollapseRoutingModule
  ]
})
export class CollapseModule { }
