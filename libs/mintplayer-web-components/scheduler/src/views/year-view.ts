import { dateService, timelineService } from '@mintplayer/web-components/scheduler-core';
import { BaseView } from './base-view';
import { SchedulerState } from '../state/scheduler-state';
/**
 * Year view renderer
 */
export class YearView extends BaseView {
  /** Cache of `.scheduler-year-month` cards keyed by `YYYY-MM`. */
  private monthCards: Map<string, HTMLElement> = new Map();

  render(): void {
    this.clearContainer();
    this.container.classList.add('scheduler-year-view');

    const { date, options } = this.state;
    const months = dateService.getYearMonths(date);

    const grid = this.createElement('div', 'scheduler-year-grid');

    this.monthCards.clear();
    for (const month of months) {
      const monthEl = this.createMonthCard(month);
      grid.appendChild(monthEl);
    }

    this.container.appendChild(grid);

    // Phase B: apply roving tabindex once cards are in place.
    this.updateMonthCardFocus();
  }

  /**
   * Build a `YYYY-MM` key from a Date, which is the unit of focus on year
   * view (PRD scheduler-controlled-selection §5.2 — year cells are months,
   * not days).
   */
  private static monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private createMonthCard(month: Date): HTMLElement {
    const { events, options } = this.state;
    const card = this.createElement('div', 'scheduler-year-month');

    // Phase B keyboard nav: the *card* is the focusable cell on year view —
    // not the inner day cells, which stay non-tabbable so screen readers
    // describe months, not days.
    const monthKey = YearView.monthKey(month);
    card.setAttribute('role', 'gridcell');
    card.setAttribute('tabindex', '-1');
    card.setAttribute('aria-selected', 'false');
    card.id = `scheduler-cell-y-${monthKey}`;
    this.setData(card, { month: month.toISOString() });
    this.monthCards.set(monthKey, card);

    // Month header
    const header = this.createElement('div', 'scheduler-year-month-header');
    header.textContent = dateService.getMonthName(month, options.locale);
    this.setData(header, { month: month.toISOString() });
    card.appendChild(header);

    // Mini calendar
    const miniMonth = this.createElement('div', 'scheduler-mini-month');

    // Day headers
    const weeks = dateService.getMonthWeeks(month, options.firstDayOfWeek);
    const firstWeek = weeks[0];

    for (const day of firstWeek) {
      const dayHeader = this.createElement('div', 'scheduler-mini-day', 'header');
      dayHeader.textContent = dateService.getDayName(day, options.locale, 'narrow');
      dayHeader.style.fontWeight = '600';
      dayHeader.style.color = '#666';
      miniMonth.appendChild(dayHeader);
    }

    // Days
    const monthStart = dateService.getMonthStart(month);
    const monthEnd = dateService.getMonthEnd(month);
    const monthEvents = timelineService.filterByRange(events, monthStart, monthEnd);

    // Create a set of dates that have events
    const datesWithEvents = new Set<string>();
    for (const event of monthEvents) {
      const current = new Date(event.start);
      current.setHours(0, 0, 0, 0);
      while (current <= event.end) {
        datesWithEvents.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }

    for (const week of weeks) {
      for (const day of week) {
        const dayEl = this.createElement('div', 'scheduler-mini-day');
        dayEl.textContent = String(day.getDate());
        this.setData(dayEl, { date: day.toISOString() });

        if (!dateService.isSameMonth(day, month)) {
          dayEl.classList.add('other-month');
        }

        if (dateService.isToday(day)) {
          dayEl.classList.add('today');
        }

        const dateKey = day.toISOString().split('T')[0];
        if (datesWithEvents.has(dateKey)) {
          dayEl.classList.add('has-events');
        }

        miniMonth.appendChild(dayEl);
      }
    }

    card.appendChild(miniMonth);
    return card;
  }

  /**
   * Apply roving tabindex based on `state.focusedDate`'s month. Year-view's
   * focus unit is a month, so we strip down `focusedDate` to its `YYYY-MM`
   * key. Falls back to the displayed year's first month if no focus yet.
   */
  private updateMonthCardFocus(): void {
    const focused = this.state.focusedDate;
    let promoted = false;
    const focusedKey = focused ? YearView.monthKey(focused) : null;
    for (const [key, card] of this.monthCards) {
      const isFocused = key === focusedKey;
      card.setAttribute('tabindex', isFocused ? '0' : '-1');
      card.setAttribute('aria-selected', isFocused ? 'true' : 'false');
      if (isFocused) promoted = true;
    }
    if (!promoted) {
      this.monthCards.values().next().value?.setAttribute('tabindex', '0');
    }
  }

  update(state: SchedulerState): void {
    const yearChanged = this.state.date.getFullYear() !== state.date.getFullYear();
    this.state = state;
    if (yearChanged) {
      this.render();
      return;
    }
    // Same year displayed — pick up focused-date changes without re-rendering
    // the whole grid (avoids losing focus mid-keypress).
    this.updateMonthCardFocus();
  }

  destroy(): void {
    this.monthCards.clear();
    this.clearContainer();
  }
}
