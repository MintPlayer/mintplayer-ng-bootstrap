/// <reference types="./types" />

import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, filter, map, Observable, take } from 'rxjs';
import { BsCalendarMonthService, BsMonthNamePipe, BsWeekdayNamePipe, DateDayOfMonth, Week, WeekDay } from '@mintplayer/ng-bootstrap/calendar-month';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BsUcFirstPipe } from '@mintplayer/ng-bootstrap/uc-first';

@Component({
  selector: 'bs-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  standalone: true,
  imports: [AsyncPipe, BsUcFirstPipe, BsMonthNamePipe, BsWeekdayNamePipe]
})
export class BsCalendarComponent {
  constructor(private sanitizer: DomSanitizer, private calendarMonthService: BsCalendarMonthService) {
    this.weeks$ = this.currentMonth$
      .pipe(map((month) => this.calendarMonthService.getWeeks(month)));
    this.shownDays$ = this.weeks$
      .pipe(filter((weeks) => weeks.length > 1))
      .pipe(map((weeks) => weeks[1].days))
      .pipe(
        map((days) => {
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
        })
      );
    this.selectedDate$.pipe(takeUntilDestroyed())
      .subscribe(date => this.selectedDateChange.emit(date));
    this.currentMonth$.pipe(takeUntilDestroyed())
      .subscribe(month => this.currentMonthChange.emit(month));
    import('bootstrap-icons/icons/chevron-left.svg').then((icon) => {
      this.chevronLeft = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/chevron-right.svg').then((icon) => {
      this.chevronRight = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
  }

  chevronLeft?: SafeHtml;
  chevronRight?: SafeHtml;
  weeks$: Observable<Week[]>;
  shownDays$: Observable<WeekDay[]>;

  //#region CurrentMonth
  currentMonth$ = new BehaviorSubject<Date>(new Date());
  @Output() public currentMonthChange = new EventEmitter<Date>();
  get currentMonth() {
    return this.currentMonth$.value;
  }
  @Input() set currentMonth(value: Date) {
    this.currentMonth$.next(value);
  }
  //#endregion
  //#region SelectedDate
  selectedDate$ = new BehaviorSubject<Date>(new Date());
  @Output() public selectedDateChange = new EventEmitter<Date>();
  get selectedDate() {
    return this.selectedDate$.value;
  }
  @Input() set selectedDate(value: Date) {
    this.selectedDate$.next(value);
  }
  //#endregion

  @Input() disableDateFn?: (date: Date) => boolean;

  previousMonth() {
    this.currentMonth$.pipe(take(1)).subscribe((month) => {
      this.currentMonth$.next(
        new Date(month.getFullYear(), month.getMonth() - 1, 1)
      );
    });

    return false;
  }

  nextMonth() {
    this.currentMonth$.pipe(take(1)).subscribe((month) => {
      this.currentMonth$.next(
        new Date(month.getFullYear(), month.getMonth() + 1, 1)
      );
    });

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
      this.selectedDate$.next(day.date);
    }
  }
}
