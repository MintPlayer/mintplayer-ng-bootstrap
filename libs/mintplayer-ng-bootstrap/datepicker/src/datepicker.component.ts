import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss']
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

}
