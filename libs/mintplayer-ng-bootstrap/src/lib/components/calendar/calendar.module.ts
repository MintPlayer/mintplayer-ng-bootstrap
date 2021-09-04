import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from './calendar.component';
import { BsMonthNamePipeModule } from '../../pipes/month-name/month-name.module';
import { BsUcFirstPipeModule } from '../../pipes/uc-first/uc-first.module';
import { BsWeekdayNameModule } from '../../pipes/weekday-name/weekday-name.module';

@NgModule({
  declarations: [
    CalendarComponent
  ],
  imports: [
    CommonModule,
    BsUcFirstPipeModule,
    BsMonthNamePipeModule,
    BsWeekdayNameModule
  ],
  exports: [
    CalendarComponent
  ]
})
export class BsCalendarModule { }
