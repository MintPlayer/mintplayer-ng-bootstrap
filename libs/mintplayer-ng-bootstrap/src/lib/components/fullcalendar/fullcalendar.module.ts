import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFullcalendarComponent } from './components/fullcalendar/fullcalendar.component';



@NgModule({
  declarations: [
    BsFullcalendarComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsFullcalendarComponent
  ]
})
export class BsFullcalendarModule { }
