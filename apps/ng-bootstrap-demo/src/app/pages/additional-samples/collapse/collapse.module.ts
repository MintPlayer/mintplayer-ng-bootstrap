import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAlertModule } from '@mintplayer/ng-bootstrap';

import { CollapseRoutingModule } from './collapse-routing.module';
import { CollapseComponent } from './collapse.component';


@NgModule({
  declarations: [
    CollapseComponent
  ],
  imports: [
    CommonModule,
    BsAlertModule,
    CollapseRoutingModule
  ]
})
export class CollapseModule { }
