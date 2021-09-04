import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeekdayNamePipe } from './weekday-name.pipe';



@NgModule({
  declarations: [
    WeekdayNamePipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    WeekdayNamePipe
  ]
})
export class BsWeekdayNameModule { }
