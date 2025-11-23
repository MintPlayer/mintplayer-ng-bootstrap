import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';

@Component({
  selector: 'demo-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  imports: [DatePipe, BsDatepickerComponent]
})
export class DatepickerComponent {

  selectedDate = new Date();
  disableDate = (date: Date) => {
    return date.getDate() % 2 === 0;
  }
}
