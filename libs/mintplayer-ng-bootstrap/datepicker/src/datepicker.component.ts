import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';

@Component({
  selector: 'bs-datepicker',
  standalone: true,
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  imports: [DatePipe, BsCalendarComponent, BsDropdownModule, BsButtonTypeDirective],
})
export class BsDatepickerComponent {

  colors = Color;

  //#region SelectedDate
  _selectedDate = new Date();
  @Output() public selectedDateChange = new EventEmitter<Date>();
  get selectedDate() {
    return this._selectedDate;
  }
  @Input() set selectedDate(value: Date) {
    this._selectedDate = value;
    this.selectedDateChange.emit(value);
  }
  //#endregion

  //#region CurrentMonth
  _currentMonth = new Date();
  @Output() public currentMonthChange = new EventEmitter<Date>();
  get currentMonth() {
    return this._currentMonth;
  }
  @Input() set currentMonth(value: Date) {
    this._currentMonth = value;
    this.currentMonthChange.emit(value);
  }
  //#endregion

  @Input() disableDateFn?: (date: Date) => boolean;

}
