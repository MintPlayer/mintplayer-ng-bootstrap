import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFullcalendarComponent } from './components/fullcalendar/fullcalendar.component';
import { BsSecondsTimespanPipe } from './pipes/bs-seconds-timespan.pipe/bs-seconds-timespan.pipe';
import { BsSecondsTodayOffsetPipe } from './pipes/bs-seconds-today-offset/bs-seconds-today-offset.pipe';
import { DateOffsetPipe } from './pipes/date-offset/date-offset.pipe';
import { DayOfWeekPipe } from './pipes/day-of-week/day-of-week.pipe';

@NgModule({
  declarations: [
    BsFullcalendarComponent,
    BsSecondsTimespanPipe,
    BsSecondsTodayOffsetPipe,
    DateOffsetPipe,
    DayOfWeekPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsFullcalendarComponent
  ]
})
export class BsFullcalendarModule { }
