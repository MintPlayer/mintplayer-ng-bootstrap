import { DatePipe } from '@angular/common';
import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';

@Component({
  selector: 'demo-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  imports: [DatePipe, BsDatepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatepickerComponent {

  selectedDate = model(new Date());
  disableDate = (date: Date) => {
    return date.getDate() % 2 === 0;
  }
}
