import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTimepickerComponent } from '@mintplayer/ng-bootstrap/timepicker';

@Component({
  selector: 'demo-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss'],
  imports: [DatePipe, BsFormModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTimepickerComponent]
})
export class TimepickerComponent {
  selectedTime = new Date();
}
