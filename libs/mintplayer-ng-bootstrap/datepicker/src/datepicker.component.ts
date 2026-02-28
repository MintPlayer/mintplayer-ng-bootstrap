import { DatePipe } from '@angular/common';
import { Component, input, model, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';

@Component({
  selector: 'bs-datepicker',
  standalone: true,
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  imports: [DatePipe, BsCalendarComponent, BsDropdownModule, BsButtonTypeDirective, BsHasOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDatepickerComponent {

  colors = Color;

  selectedDate = model<Date>(new Date());
  currentMonth = model<Date>(new Date());
  disableDateFn = input<((date: Date) => boolean) | undefined>(undefined);

}
