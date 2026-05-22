import {
  dateService,
  timelineService,
  SchedulerEvent,
  getContrastColor,
} from '@mintplayer/web-components/scheduler-core';
import { BaseView } from './base-view';
import { SchedulerState } from '../state/scheduler-state';

/**
 * Month view renderer
 */
export class MonthView extends BaseView {
  private dayCells: Map<string, HTMLElement> = new Map();

  render(): void {
    this.clearContainer();
    this.container.classList.add('scheduler-month-view');

    const { date, options } = this.state;
    const weeks = dateService.getMonthWeeks(date, options.firstDayOfWeek);

    // Create day-of-week headers
    const headers = this.createElement('div', 'scheduler-day-headers');
    const firstWeek = weeks[0];

    for (const day of firstWeek) {
      const header = this.createElement('div', 'scheduler-day-header');
      header.textContent = dateService.getDayName(day, options.locale);
      headers.appendChild(header);
    }

    this.container.appendChild(headers);

    // Create month grid
    const grid = this.createElement('div', 'scheduler-month-grid');

    for (const week of weeks) {
      for (const day of week) {
        const cell = this.createDayCell(day);
        grid.appendChild(cell);
      }
    }

    this.container.appendChild(grid);

    // Render events
    this.renderEvents();

    // Apply roving tabindex now that all cells are in place.
    this.updateDayCellFocus();
  }

  /**
   * Build a `YYYY-MM-DD` key from a Date using *local* components. Using
   * `toISOString()` here would shift the key in any non-UTC timezone (a
   * local midnight on May 12 in CEST is May 11 22:00 UTC), and the resulting
   * cell IDs would not match the visible day numbers.
   */
  static dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private createDayCell(day: Date): HTMLElement {
    const { date } = this.state;
    const cell = this.createElement('div', 'scheduler-month-day');

    if (!dateService.isSameMonth(day, date)) {
      cell.classList.add('other-month');
    }

    if (dateService.isToday(day)) {
      cell.classList.add('today');
    }

    // Phase B keyboard nav: each day cell is a roving-tabindex `gridcell`
    // with a stable id keyed off the local ISO date. `updateDayCellFocus()`
    // picks the focused cell out of the cache and promotes its tabindex to 0.
    const key = MonthView.dayKey(day);
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('tabindex', '-1');
    cell.setAttribute('aria-selected', 'false');
    cell.id = `scheduler-cell-m-${key}`;

    // Day number
    const dayNumber = this.createElement('div', 'day-number');
    dayNumber.textContent = String(day.getDate());
    cell.appendChild(dayNumber);

    // Events container
    const eventsContainer = this.createElement('div', 'month-events');
    cell.appendChild(eventsContainer);

    // Store reference
    this.dayCells.set(key, cell);
    this.setData(cell, { date: key });

    return cell;
  }

  /**
   * Apply roving tabindex based on `state.focusedDate`. The grid must always
   * have exactly one tab-reachable cell, so when no date is focused yet we
   * fall back to today (if visible) or the first day of the displayed month.
   */
  private updateDayCellFocus(): void {
    const focused = this.state.focusedDate;
    let promoted = false;
    const focusedKey = focused ? MonthView.dayKey(focused) : null;
    for (const [key, cell] of this.dayCells) {
      const isFocused = key === focusedKey;
      cell.setAttribute('tabindex', isFocused ? '0' : '-1');
      cell.setAttribute('aria-selected', isFocused ? 'true' : 'false');
      if (isFocused) promoted = true;
    }
    if (!promoted) {
      // Fallback: today's cell if it's in the displayed month, else the first
      // cell that belongs to the displayed month (skip leading other-month
      // spillover).
      const fallback =
        Array.from(this.dayCells.values()).find((c) => c.classList.contains('today') && !c.classList.contains('other-month')) ||
        Array.from(this.dayCells.values()).find((c) => !c.classList.contains('other-month')) ||
        this.dayCells.values().next().value;
      fallback?.setAttribute('tabindex', '0');
    }
  }

  private renderEvents(): void {
    const { date, events, options } = this.state;
    const monthStart = dateService.getMonthStart(date);
    const monthEnd = dateService.getMonthEnd(date);

    // Get weeks for full view range
    const weeks = dateService.getMonthWeeks(date, options.firstDayOfWeek);
    const viewStart = weeks[0][0];
    const viewEnd = weeks[weeks.length - 1][6];
    viewEnd.setHours(23, 59, 59, 999);

    // Filter events for the view range
    const viewEvents = timelineService.filterByRange(events, viewStart, viewEnd);

    // Group events by day
    const eventsByDay = new Map<string, SchedulerEvent[]>();

    for (const event of viewEvents) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Iterate through each day the event spans
      const current = new Date(eventStart);
      current.setHours(0, 0, 0, 0);

      while (current <= eventEnd) {
        const key = MonthView.dayKey(current);
        if (!eventsByDay.has(key)) {
          eventsByDay.set(key, []);
        }
        eventsByDay.get(key)!.push(event);
        current.setDate(current.getDate() + 1);
      }
    }

    // Render events in each day cell
    const maxEventsPerDay = typeof options.dayMaxEvents === 'number'
      ? options.dayMaxEvents
      : 3;

    for (const [key, dayEvents] of eventsByDay) {
      const cell = this.dayCells.get(key);
      if (!cell) continue;

      const eventsContainer = cell.querySelector('.month-events');
      if (!eventsContainer) continue;

      // Clear existing events
      eventsContainer.innerHTML = '';

      const visibleEvents = dayEvents.slice(0, maxEventsPerDay);
      const hiddenCount = dayEvents.length - visibleEvents.length;

      for (const event of visibleEvents) {
        const eventEl = this.createElement('div', 'scheduler-month-event');
        eventEl.textContent = event.title;
        eventEl.style.backgroundColor = event.color ?? '#3788d8';
        eventEl.style.color = event.textColor ?? getContrastColor(event.color ?? '#3788d8');
        this.setData(eventEl, { eventId: event.id });
        eventsContainer.appendChild(eventEl);
      }

      if (hiddenCount > 0) {
        const moreLink = this.createElement('div', 'scheduler-more-link');
        moreLink.textContent = `+${hiddenCount} more`;
        this.setData(moreLink, { date: key });
        eventsContainer.appendChild(moreLink);
      }
    }
  }

  update(state: SchedulerState): void {
    const dateChanged = this.state.date.getMonth() !== state.date.getMonth() ||
                        this.state.date.getFullYear() !== state.date.getFullYear();
    const optionsChanged = this.optionsRequireRerender(this.state.options, state.options);
    this.state = state;

    // If month or relevant options changed, we need to re-render the entire view
    if (dateChanged || optionsChanged) {
      this.render();
      return;
    }

    this.renderEvents();
    // Pick up focused-date changes that don't require a re-render (within month).
    this.updateDayCellFocus();
  }

  private optionsRequireRerender(oldOpts: SchedulerState['options'], newOpts: SchedulerState['options']): boolean {
    return oldOpts.firstDayOfWeek !== newOpts.firstDayOfWeek ||
           oldOpts.dayMaxEvents !== newOpts.dayMaxEvents ||
           oldOpts.locale !== newOpts.locale;
  }

  destroy(): void {
    this.dayCells.clear();
    this.clearContainer();
  }
}
