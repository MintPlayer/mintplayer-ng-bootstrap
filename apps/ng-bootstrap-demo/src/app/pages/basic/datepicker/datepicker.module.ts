import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatepickerModule } from '@mintplayer/ng-bootstrap';

import { DatepickerRoutingModule } from './datepicker-routing.module';
import { DatepickerComponent } from './datepicker.component';


@NgModule({
  declarations: [
    DatepickerComponent
  ],
  imports: [
    CommonModule,
    BsDatepickerModule,
    DatepickerRoutingModule
  ]
})
export class DatepickerModule { }
