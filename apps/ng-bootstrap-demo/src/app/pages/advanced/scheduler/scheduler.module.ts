import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsSchedulerModule } from '@mintplayer/ng-bootstrap';

import { SchedulerComponent } from './scheduler.component';
import { SchedulerRoutingModule } from './scheduler-routing.module';


@NgModule({
  declarations: [
    SchedulerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsSchedulerModule,
    SchedulerRoutingModule
  ]
})
export class SchedulerModule { }
