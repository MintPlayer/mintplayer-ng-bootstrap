import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSecondsTimespanPipe } from './pipes/bs-seconds-timespan.pipe/bs-seconds-timespan.pipe';
import { BsSecondsTodayOffsetPipe } from './pipes/bs-seconds-today-offset/bs-seconds-today-offset.pipe';
import { DateOffsetPipe } from './pipes/date-offset/date-offset.pipe';
import { DayOfWeekPipe } from './pipes/day-of-week/day-of-week.pipe';
import { BsSchedulerComponent } from './components/scheduler/scheduler.component';
import { ResourceGroupPresenterComponent } from './components/resource-group-presenter/resource-group-presenter.component';

@NgModule({
  declarations: [
    BsSchedulerComponent,
    BsSecondsTimespanPipe,
    BsSecondsTodayOffsetPipe,
    DateOffsetPipe,
    DayOfWeekPipe,
    ResourceGroupPresenterComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsSchedulerComponent,
    ResourceGroupPresenterComponent
  ]
})
export class BsSchedulerModule { }
