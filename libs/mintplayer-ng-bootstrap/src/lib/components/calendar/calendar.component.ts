import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {
  BehaviorSubject,
  filter,
  map,
  Observable,
  Subject,
  take,
  takeUntil,
} from 'rxjs';
import { DateDayOfMonth } from '../../interfaces/date-day-of-month';
import { Week } from '../../interfaces/week';
import { BsCalendarMonthService } from '../../services/calendar-month/calendar-month.service';

@Component({
  selector: 'bs-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class BsCalendarComponent implements OnDestroy {
  constructor(
    private calendarMonthService: BsCalendarMonthService,
    private ref: ChangeDetectorRef
  ) {
    this.weeks$ = this.currentMonth$
      .pipe(map((month) => this.calendarMonthService.getWeeks(month)))
      .pipe(takeUntil(this.destroyed$));
    this.daysOfWeek$ = this.weeks$
      .pipe(filter((weeks) => weeks.length > 1))
      .pipe(map((weeks) => weeks[1].week))
      .pipe(
        map((week) => {
          const firstDay = week[0];
          if (firstDay) {
            return week.map((d) => {
              const date = new Date(
                firstDay.date.getFullYear(),
                firstDay.date.getMonth(),
                d?.dayOfMonth
              );
              return date.toLocaleString('default', { weekday: 'short' });
            });
          } else {
            return [];
          }
        })
      );
    this.selectedDate$.pipe(takeUntil(this.destroyed$)).subscribe((date) => {
      this.selectedDateChange.emit(date);
    });
    this.currentMonth$.pipe(takeUntil(this.destroyed$)).subscribe((month) => {
      this.currentMonthChange.emit(month);
    });
  }

  private destroyed$ = new Subject();
  weeks$: Observable<Week[]>;
  daysOfWeek$: Observable<string[]>;

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

  daysOfWeek: string[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

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
    if (day) {
      this.selectedDate$.next(day.date);
    }
  }
}
