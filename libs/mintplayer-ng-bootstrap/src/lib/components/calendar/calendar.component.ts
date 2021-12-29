import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, filter, map, Observable, Subject, take, takeUntil } from 'rxjs';
import { DateDayOfMonth } from '../../interfaces/date-day-of-month';
import { Week } from '../../interfaces/week';
import { BsCalendarMonthService } from '../../services/calendar-month/calendar-month.service';

@Component({
  selector: 'bs-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class BsCalendarComponent implements OnDestroy {

  constructor(private calendarMonthService: BsCalendarMonthService, private ref: ChangeDetectorRef) {
    this.month$ = new BehaviorSubject<Date>(new Date());
    this.weeks$ = this.month$
      .pipe(map((month) => this.calendarMonthService.getWeeks(month)))
      .pipe(takeUntil(this.destroyed$));
    this.daysOfWeek$ = this.weeks$
      .pipe(filter((weeks) => weeks.length > 1))
      .pipe(map((weeks) => weeks[1].week))
      .pipe(map((week) => {
        const firstDay = week[0];
        if (firstDay) {
          return week.map(d => {
            const date = new Date(firstDay.date.getFullYear(), firstDay.date.getMonth(), d?.dayOfMonth);
            return date.toLocaleString("default", { weekday: 'short' });
          });
        } else {
          return [];
        }
      }));
    
  }

  private destroyed$ = new Subject();
  month$: BehaviorSubject<Date>;
  weeks$: Observable<Week[]>;
  daysOfWeek$: Observable<string[]>;
  selectedDate$ = new BehaviorSubject<Date>(new Date());

  daysOfWeek: string[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  
  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  previousMonth() {
    this.month$.pipe(take(1)).subscribe((month) => {
      this.month$.next(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    });

    return false;
  }

  nextMonth() {
    this.month$.pipe(take(1)).subscribe((month) => {
      this.month$.next(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    });
    
    return false;
  }

  isSameDate(date1: Date | null, date2: Date | null) {
    if ((date1 === null) && (date2 === null)) return true;
    if ((date1 === null) || (date2 === null)) return false;

    return (date1.getFullYear() === date2.getFullYear())
      && (date1.getMonth() === date2.getMonth())
      && (date1.getDate() === date2.getDate());
  }

  goto(day: DateDayOfMonth | null) {
    if (day) {
      this.selectedDate$.next(day.date);
    }
  }
}
