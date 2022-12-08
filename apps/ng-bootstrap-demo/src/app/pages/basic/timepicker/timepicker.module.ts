import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTimepickerModule } from '@mintplayer/ng-bootstrap/timepicker';

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
