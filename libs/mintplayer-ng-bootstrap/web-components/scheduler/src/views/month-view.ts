import {
  dateService,
  timelineService,
  SchedulerEvent,
  getContrastColor,
} from '@mintplayer/scheduler-core';
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

    // Day number
    const dayNumber = this.createElement('div', 'day-number');
    dayNumber.textContent = String(day.getDate());
    cell.appendChild(dayNumber);

    // Events container
    const eventsContainer = this.createElement('div', 'month-events');
    cell.appendChild(eventsContainer);

    // Store reference
    const key = day.toISOString().split('T')[0];
    this.dayCells.set(key, cell);
    this.setData(cell, { date: key });

    return cell;
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
        const key = current.toISOString().split('T')[0];
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
