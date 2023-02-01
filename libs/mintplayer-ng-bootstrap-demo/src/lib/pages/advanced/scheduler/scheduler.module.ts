import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsSchedulerModule } from '@mintplayer/ng-bootstrap/scheduler';
import { BsInputGroupModule } from '@mintplayer/ng-bootstrap/input-group';
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
    BsFormModule,
    BsInputGroupModule,
    BsButtonTypeModule,
    BsSelectModule,
    BsSchedulerModule,
    SchedulerRoutingModule
  ]
})
export class SchedulerModule { }
