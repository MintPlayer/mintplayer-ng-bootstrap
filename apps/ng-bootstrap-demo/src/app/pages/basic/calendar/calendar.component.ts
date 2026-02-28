import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';

@Component({
  selector: 'demo-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  standalone: true,
  imports: [BsCalendarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {}
