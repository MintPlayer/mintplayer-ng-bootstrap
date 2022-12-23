import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatepickerComponent } from './datepicker.component';
import { BsCalendarModule } from '@mintplayer/ng-bootstrap/calendar';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';



@NgModule({
  declarations: [
    BsDatepickerComponent
  ],
  imports: [
    CommonModule,
    BsCalendarModule,
    BsDropdownModule,
    BsButtonTypeModule,
    BsHasOverlayModule,
  ],
  exports: [
    BsDatepickerComponent
  ]
})
export class BsDatepickerModule { }
