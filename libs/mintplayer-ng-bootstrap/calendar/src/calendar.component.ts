/// <reference types="./types" />

import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector, input, model, signal } from '@angular/core';
import { BsCalendarMonthService, BsMonthNamePipe, DateDayOfMonth, WeekDay } from '@mintplayer/ng-bootstrap/calendar-month';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BsUcFirstPipe } from '@mintplayer/ng-bootstrap/uc-first';

@Component({
  selector: 'bs-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  imports: [BsUcFirstPipe, BsMonthNamePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCalendarComponent {
  private sanitizer = inject(DomSanitizer);
  private calendarMonthService = inject(BsCalendarMonthService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private idService = inject(BsIdService);
  private injector = inject(Injector);

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

  /**
   * The date that owns the grid's single tab stop (roving tabindex). Defaults
   * to selectedDate when it lands inside currentMonth, then today, then the
   * first enabled day of the month — matching APG Date Picker Dialog
   * convention. Set imperatively by the keymap; re-focused after Angular
   * re-renders via afterNextRender.
   */
  readonly focusedDate = signal<Date | null>(null);

  /** Whether to push focus to the focused cell after the next render. */
  private pendingFocusMove = false;

  /** Stable id for the month-title cell, used by the grid's aria-labelledby. */
  readonly monthLabelId = this.idService.next('bs-calendar-month');

  /** Stable id-per-cell so afterNextRender focus restoration can find the new cell. */
  cellId(date: Date): string {
    return `${this.monthLabelId}-cell-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  weeks = computed(() => this.calendarMonthService.getWeeks(this.currentMonth()));

  isToday(date: Date): boolean {
    const now = new Date();
    return this.isSameDate(date, now);
  }

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
      this.focusedDate.set(day.date);
    }
  }

  /**
   * Compute the cell that should carry tabindex="0". One per month — the
   * focused-date if it's inside this month, else the selected date, else
   * today, else the first enabled day. Mirrors APG Date Picker convention.
   */
  readonly focusableDate = computed(() => {
    const month = this.currentMonth();
    const inMonth = (d: Date) => d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    const candidate = (d: Date | null): Date | null => (d && inMonth(d) ? d : null);

    const focused = candidate(this.focusedDate());
    if (focused) return focused;

    const selected = candidate(this.selectedDate());
    if (selected) return selected;

    const today = new Date();
    const todayInMonth = candidate(today);
    if (todayInMonth) return todayInMonth;

    // Fall back to first enabled day of the month.
    const disableFn = this.disableDateFn();
    for (const week of this.weeks()) {
      for (const day of week.days) {
        if (day && day.isInMonth && (!disableFn || !disableFn(day.date))) {
          return day.date;
        }
      }
    }
    return null;
  });

  /**
   * APG Date Picker keymap. Tab into the grid lands on the focusableDate
   * cell; arrow keys then navigate days/weeks; PageUp/Down change month;
   * Ctrl+PageUp/Down change year; Home/End jump to week edges; Enter/Space
   * selects.
   */
  onCellKeyDown(event: KeyboardEvent, day: DateDayOfMonth | null): void {
    if (!day || !day.isInMonth) return;

    const isNav =
      event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
      event.key === 'Home' || event.key === 'End' ||
      event.key === 'PageUp' || event.key === 'PageDown';
    const isSelect = event.key === 'Enter' || event.key === ' ';
    if (!isNav && !isSelect) return;

    event.preventDefault();

    if (isSelect) {
      this.goto(day);
      return;
    }

    const current = day.date;
    let target = new Date(current);
    switch (event.key) {
      case 'ArrowLeft': target.setDate(current.getDate() - 1); break;
      case 'ArrowRight': target.setDate(current.getDate() + 1); break;
      case 'ArrowUp': target.setDate(current.getDate() - 7); break;
      case 'ArrowDown': target.setDate(current.getDate() + 7); break;
      case 'Home': target.setDate(current.getDate() - current.getDay()); break;
      case 'End': target.setDate(current.getDate() + (6 - current.getDay())); break;
      case 'PageUp':
        target = event.ctrlKey
          ? new Date(current.getFullYear() - 1, current.getMonth(), current.getDate())
          : new Date(current.getFullYear(), current.getMonth() - 1, current.getDate());
        break;
      case 'PageDown':
        target = event.ctrlKey
          ? new Date(current.getFullYear() + 1, current.getMonth(), current.getDate())
          : new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
        break;
    }

    this.moveFocusTo(target);
  }

  private moveFocusTo(target: Date): void {
    const month = this.currentMonth();
    const sameMonth =
      target.getFullYear() === month.getFullYear() && target.getMonth() === month.getMonth();
    if (!sameMonth) {
      // Switch month; the cell will be in the next render.
      this.currentMonth.set(new Date(target.getFullYear(), target.getMonth(), 1));
    }
    this.focusedDate.set(target);
    this.pendingFocusMove = true;
    afterNextRender(
      () => {
        if (!this.pendingFocusMove) return;
        this.pendingFocusMove = false;
        const id = this.cellId(target);
        const cell = this.elementRef.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`);
        cell?.focus();
      },
      { injector: this.injector },
    );
  }

}
