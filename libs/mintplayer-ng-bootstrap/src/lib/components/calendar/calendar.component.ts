import { Component, OnInit } from '@angular/core';
import { Week } from '../../interfaces/week';
import { CalendarMonthService } from '../../services/calendar-month/calendar-month.service';

@Component({
  selector: 'bs-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {

  constructor(private calendarMonthService: CalendarMonthService) {
  }

  daysOfWeek: string[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  ngOnInit() {
    this.month = new Date();
  }

  //#region SelectedDate
  selectedDate: Date = new Date();
  //#endregion
  //#region Month
  private _month!: Date;
  public get month() {
    return this._month;
  }
  public set month(value: Date) {
    this._month = value;
    this.weeks = this.calendarMonthService.getWeeks(this.month);
  }
  //#endregion
  //#region Weeks
  private _weeks: Week[] = []
  get weeks() {
    return this._weeks;
  }
  set weeks(value: Week[]) {
    this._weeks = value;
    if (this._weeks.length > 1) {
      this.daysOfWeek = this._weeks[1].week.map(d => {
        let date = new Date(this.month.getFullYear(), this.month.getMonth(), d?.dayOfMonth);
        return date.toLocaleString("default", { weekday: 'short' });
      });
    }
  }
  //#endregion

  previousMonth() {
    this.month = new Date(this.month.getFullYear(), this.month.getMonth() - 1, 1);
    return false;
  }

  nextMonth() {
    this.month = new Date(this.month.getFullYear(), this.month.getMonth() + 1, 1);
    return false;
  }

  isSameDate(date1: Date, date2: Date) {
    return (date1.getFullYear() === date2.getFullYear())
      && (date1.getMonth() === date2.getMonth())
      && (date1.getDate() === date2.getDate());
  }
}
