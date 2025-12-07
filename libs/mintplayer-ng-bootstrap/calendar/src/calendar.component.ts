/// <reference types="./types" />

import { Component, EventEmitter, Input, Output, signal, computed, effect } from '@angular/core';
import { BsCalendarMonthService, BsMonthNamePipe, BsWeekdayNamePipe, DateDayOfMonth, Week, WeekDay } from '@mintplayer/ng-bootstrap/calendar-month';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BsUcFirstPipe } from '@mintplayer/ng-bootstrap/uc-first';

@Component({
  selector: 'bs-calendar',
  standalone: true,
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  imports: [BsUcFirstPipe, BsMonthNamePipe, BsWeekdayNamePipe]
})
export class BsCalendarComponent {
  constructor(private sanitizer: DomSanitizer, private calendarMonthService: BsCalendarMonthService) {
    this.weeks = computed(() => this.calendarMonthService.getWeeks(this.currentMonthSignal()));
    this.shownDays = computed(() => {
      const weeks = this.weeks();
      if (weeks.length <= 1) return [];
      const days = weeks[1].days;
      const firstDay = days[0];
      if (firstDay) {
        return days.map((d) => {
          const date = new Date(
            firstDay.date.getFullYear(),
            firstDay.date.getMonth(),
            d?.dayOfMonth
          );
          return <WeekDay>{
            short: date.toLocaleString('default', { weekday: 'short' }),
            long: date.toLocaleString('default', { weekday: 'long' })
          };
        });
      } else {
        return [];
      }
    });

    effect(() => {
      this.selectedDateChange.emit(this.selectedDateSignal());
    });
    effect(() => {
      this.currentMonthChange.emit(this.currentMonthSignal());
    });

    import('bootstrap-icons/icons/chevron-left.svg').then((icon) => {
      this.chevronLeft = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/chevron-right.svg').then((icon) => {
      this.chevronRight = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
  }

  chevronLeft?: SafeHtml;
  chevronRight?: SafeHtml;
  weeks;
  shownDays;

  //#region CurrentMonth
  currentMonthSignal = signal<Date>(new Date());
  @Input() set currentMonth(val: Date) {
    this.currentMonthSignal.set(val);
  }
  get currentMonth() {
    return this.currentMonthSignal();
  }
  @Output() public currentMonthChange = new EventEmitter<Date>();
  //#endregion
  //#region SelectedDate
  selectedDateSignal = signal<Date>(new Date());
  @Input() set selectedDate(val: Date) {
    this.selectedDateSignal.set(val);
  }
  get selectedDate() {
    return this.selectedDateSignal();
  }
  @Output() public selectedDateChange = new EventEmitter<Date>();
  //#endregion

  @Input() disableDateFn?: (date: Date) => boolean;

  previousMonth() {
    const month = this.currentMonthSignal();
    this.currentMonthSignal.set(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    return false;
  }

  nextMonth() {
    const month = this.currentMonthSignal();
    this.currentMonthSignal.set(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    return false;
  }

  isSameDate(date1: Date | null, date2: Date | null) {
    if (date1 === null && date2 === null) return true;
    if (date1 === null || date2 === null) return false;

    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  goto(day: DateDayOfMonth | null) {
    if (day && day.isInMonth && (!this.disableDateFn || !this.disableDateFn(day.date))) {
      this.selectedDateSignal.set(day.date);
    }
  }
}
