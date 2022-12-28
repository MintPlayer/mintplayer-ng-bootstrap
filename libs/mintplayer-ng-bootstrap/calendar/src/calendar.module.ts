import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCalendarComponent } from './calendar.component';
import { BsUcFirstPipeModule } from '@mintplayer/ng-bootstrap';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
import { BsMonthNamePipeModule, BsWeekdayNameModule } from '@mintplayer/ng-bootstrap/calendar-month';

@NgModule({
  declarations: [
    BsCalendarComponent
  ],
  imports: [
    CommonModule,
    BsIconModule,
    BsUcFirstPipeModule,
    BsMonthNamePipeModule,
    BsWeekdayNameModule
  ],
  exports: [
    BsCalendarComponent
  ]
})
export class BsCalendarModule { }
