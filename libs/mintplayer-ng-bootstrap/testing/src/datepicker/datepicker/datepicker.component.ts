import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';

@Component({
  selector: 'bs-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  providers: [
    { provide: BsDatepickerComponent, useExisting: BsDatepickerMockComponent }
  ]
})
export class BsDatepickerMockComponent {
  @Input() selectedDate = new Date();
  @Output() public selectedDateChange = new EventEmitter<Date>();
}
