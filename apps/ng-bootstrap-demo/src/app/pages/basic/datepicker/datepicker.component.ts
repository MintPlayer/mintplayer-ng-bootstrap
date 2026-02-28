import { DatePipe } from '@angular/common';
import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';

@Component({
  selector: 'demo-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  standalone: true,
  imports: [DatePipe, BsDatepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatepickerComponent {

  selectedDate = signal(new Date());
  disableDate = (date: Date) => {
    return date.getDate() % 2 === 0;
  }
}
