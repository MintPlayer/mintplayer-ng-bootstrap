import {
  dateService,
  timelineService,
} from '@mintplayer/scheduler-core';
import { BaseView } from './base-view';
import { SchedulerState } from '../state/scheduler-state';

/**
 * Year view renderer
 */
export class YearView extends BaseView {
  render(): void {
    this.clearContainer();
    this.container.classList.add('scheduler-year-view');

    const { date, options } = this.state;
    const months = dateService.getYearMonths(date);

    const grid = this.createElement('div', 'scheduler-year-grid');

    for (const month of months) {
      const monthEl = this.createMonthCard(month);
      grid.appendChild(monthEl);
    }

    this.container.appendChild(grid);
  }

  private createMonthCard(month: Date): HTMLElement {
    const { events, options } = this.state;
    const card = this.createElement('div', 'scheduler-year-month');

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

  update(state: SchedulerState): void {
    this.state = state;
    // Year view is mostly static, re-render fully
    this.render();
  }

  destroy(): void {
    this.clearContainer();
  }
}
