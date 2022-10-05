import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule, BsTimepickerModule } from '@mintplayer/ng-bootstrap';

import { TimepickerRoutingModule } from './timepicker-routing.module';
import { TimepickerComponent } from './timepicker.component';


@NgModule({
  declarations: [
    TimepickerComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsTimepickerModule,
    TimepickerRoutingModule
  ]
})
export class TimepickerModule { }
