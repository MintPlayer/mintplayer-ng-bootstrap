import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCalendarModule } from '@mintplayer/ng-bootstrap';

import { CalendarRoutingModule } from './calendar-routing.module';
import { CalendarComponent } from './calendar.component';


@NgModule({
  declarations: [
    CalendarComponent
  ],
  imports: [
    CommonModule,
    BsCalendarModule,
    CalendarRoutingModule
  ]
})
export class CalendarModule { }
