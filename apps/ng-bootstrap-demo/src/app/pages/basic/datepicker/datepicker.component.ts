import { Component } from '@angular/core';

@Component({
  selector: 'demo-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss']
})
export class DatepickerComponent {

  selectedDate = new Date();
  disableDate = (date: Date) => {
    return date.getDate() % 2 === 0;
  }
}
