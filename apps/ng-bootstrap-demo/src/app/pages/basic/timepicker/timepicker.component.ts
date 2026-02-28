import { DatePipe } from '@angular/common';
import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTimepickerComponent } from '@mintplayer/ng-bootstrap/timepicker';

@Component({
  selector: 'demo-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss'],
  standalone: true,
  imports: [DatePipe, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTimepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimepickerComponent {
  selectedTime = signal(new Date());
}
