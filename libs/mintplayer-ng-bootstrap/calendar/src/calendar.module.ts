import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCalendarComponent } from './calendar.component';
import { BsUcFirstModule } from '@mintplayer/ng-bootstrap/uc-first';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
import { BsMonthNamePipeModule, BsWeekdayNameModule } from '@mintplayer/ng-bootstrap/calendar-month';

@NgModule({
  declarations: [
    BsCalendarComponent
  ],
  imports: [
    CommonModule,
    BsIconModule,
    BsUcFirstModule,
    BsMonthNamePipeModule,
    BsWeekdayNameModule
  ],
  exports: [
    BsCalendarComponent
  ]
})
export class BsCalendarModule { }
