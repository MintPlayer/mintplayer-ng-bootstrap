import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsSchedulerModule } from '@mintplayer/ng-bootstrap/scheduler';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { SchedulerComponent } from './scheduler.component';
import { SchedulerRoutingModule } from './scheduler-routing.module';


@NgModule({
  declarations: [
    SchedulerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsCardModule,
    BsButtonTypeModule,
    BsSchedulerModule,
    SchedulerRoutingModule
  ]
})
export class SchedulerModule { }
