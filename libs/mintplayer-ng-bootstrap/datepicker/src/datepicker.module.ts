import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatepickerComponent } from './datepicker.component';
import { BsCalendarModule } from '@mintplayer/ng-bootstrap/calendar';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';



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
