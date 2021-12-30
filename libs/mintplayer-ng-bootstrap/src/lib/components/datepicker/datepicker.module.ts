import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatepickerComponent } from './datepicker.component';
import { BsCalendarModule } from '../calendar/calendar.module';
import { BsDropdownModule } from '../dropdown/dropdown.module';



@NgModule({
  declarations: [
    BsDatepickerComponent
  ],
  imports: [
    CommonModule,
    BsCalendarModule,
    BsDropdownModule
  ],
  exports: [
    BsDatepickerComponent
  ]
})
export class BsDatepickerModule { }
