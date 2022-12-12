import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCalendarMockComponent } from './calendar/calendar.component';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';

@NgModule({
  declarations: [BsCalendarMockComponent],
  imports: [CommonModule],
  exports: [BsCalendarMockComponent],
  providers: [
    { provide: BsCalendarComponent, useClass: BsCalendarMockComponent }
  ]
})
export class BsCalendarTestingModule {}
