import { Component } from '@angular/core';

@Component({
  selector: 'demo-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss']
})
export class TimepickerComponent {

  selectedTime = new Date();

}
