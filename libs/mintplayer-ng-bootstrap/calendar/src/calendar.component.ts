/// <reference types="./types" />

import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { BsCalendarMonthService, BsMonthNamePipe, BsWeekdayNamePipe, DateDayOfMonth, WeekDay } from '@mintplayer/ng-bootstrap/calendar-month';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BsUcFirstPipe } from '@mintplayer/ng-bootstrap/uc-first';

@Component({
  selector: 'bs-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  imports: [BsUcFirstPipe, BsMonthNamePipe, BsWeekdayNamePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCalendarComponent {
  private sanitizer = inject(DomSanitizer);
  private calendarMonthService = inject(BsCalendarMonthService);

  constructor() {
    import('bootstrap-icons/icons/chevron-left.svg').then((icon) => {
      this.chevronLeft.set(this.sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/chevron-right.svg').then((icon) => {
      this.chevronRight.set(this.sanitizer.bypassSecurityTrustHtml(icon.default));
    });
  }

  chevronLeft = signal<SafeHtml | undefined>(undefined);
  chevronRight = signal<SafeHtml | undefined>(undefined);

  currentMonth = model<Date>(new Date());
  selectedDate = model<Date>(new Date());
  disableDateFn = input<((date: Date) => boolean) | undefined>(undefined);

  weeks = computed(() => this.calendarMonthService.getWeeks(this.currentMonth()));

  shownDays = computed<WeekDay[]>(() => {
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

  previousMonth() {
    const month = this.currentMonth();
    this.currentMonth.set(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    return false;
  }

  nextMonth() {
    const month = this.currentMonth();
    this.currentMonth.set(new Date(month.getFullYear(), month.getMonth() + 1, 1));
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
    const disableFn = this.disableDateFn();
    if (day && day.isInMonth && (!disableFn || !disableFn(day.date))) {
      this.selectedDate.set(day.date);
    }
  }
}
