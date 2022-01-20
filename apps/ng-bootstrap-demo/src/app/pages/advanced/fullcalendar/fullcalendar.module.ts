import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFullcalendarModule } from '@mintplayer/ng-bootstrap';

import { FullcalendarRoutingModule } from './fullcalendar-routing.module';
import { FullcalendarComponent } from './fullcalendar.component';


@NgModule({
  declarations: [
    FullcalendarComponent
  ],
  imports: [
    CommonModule,
    BsFullcalendarModule,
    FullcalendarRoutingModule
  ]
})
export class FullcalendarModule { }
