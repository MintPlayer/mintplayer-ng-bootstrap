import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsLetModule } from '@mintplayer/ng-bootstrap/let';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
import { BsUcFirstModule } from '@mintplayer/ng-bootstrap/uc-first';
import { BsMonthNamePipeModule, BsWeekdayNameModule } from '@mintplayer/ng-bootstrap/calendar-month';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsCalendarComponent } from './calendar.component';

@NgModule({
  declarations: [
    BsCalendarComponent
  ],
  imports: [
    CommonModule,
    BsIconModule,
    BsLetModule,
    BsUcFirstModule,
    BsTrackByModule,
    BsMonthNamePipeModule,
    BsWeekdayNameModule
  ],
  exports: [
    BsCalendarComponent
  ]
})
export class BsCalendarModule { }
