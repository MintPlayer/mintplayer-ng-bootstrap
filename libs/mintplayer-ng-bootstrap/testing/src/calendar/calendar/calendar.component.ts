import { Component } from '@angular/core';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';

@Component({
  selector: 'bs-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  providers: [
    { provide: BsCalendarComponent, useExisting: BsCalendarMockComponent }
  ]
})
export class BsCalendarMockComponent {}
