import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss'],
})
export class BsTimepickerMockComponent {
  @Input() selectedTime = new Date();
}
