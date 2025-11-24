import { Component } from '@angular/core';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';

@Component({
  selector: 'demo-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  imports: [BsCalendarComponent]
})
export class CalendarComponent {}
