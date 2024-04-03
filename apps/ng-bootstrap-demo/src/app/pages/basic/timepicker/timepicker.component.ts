import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTimepickerComponent } from '@mintplayer/ng-bootstrap/timepicker';

@Component({
  selector: 'demo-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss'],
  standalone: true,
  imports: [DatePipe, BsFormModule, BsGridModule, BsTimepickerComponent]
})
export class TimepickerComponent {
  selectedTime = new Date();
}
