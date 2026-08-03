import {
  dateService,
  timelineService,
  SchedulerEvent,
  formatMessage,
  getContrastColor,
  resolveMessages,
} from '@mintplayer/web-components/scheduler-core';
import { BaseView, formatEventAriaLabel, toDayKey } from './base-view';
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
    const weeks = dateService.getMonthWeeks(date, this.firstDayOfWeek);

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
      // display: contents (scheduler SCSS) keeps the 7-column CSS grid
      // working while giving the ARIA grid its rows.
      const weekRow = this.createElement('div', 'scheduler-month-week');
      for (const day of week) {
        const cell = this.createDayCell(day);
        weekRow.appendChild(cell);
      }
      grid.appendChild(weekRow);
    }

    this.container.appendChild(grid);

    // Render events
    this.renderEvents();

    // Apply roving tabindex now that all cells are in place.
    this.updateDayCellFocus();

    this.applyGridRoles({
      label: formatMessage(resolveMessages(this.state.options.messages).monthGridLabel, {
        date: dateService.formatDate(this.state.date, this.state.options.locale, {
          month: 'long',
          year: 'numeric',
        }),
      }),
      columnHeaderRow: ':scope > .scheduler-day-headers',
      columnHeaders: '.scheduler-day-headers > .scheduler-day-header',
      presentation: ['.scheduler-month-grid'],
      rows: '.scheduler-month-week',
    });
    this.markToday();
  }

  /**
   * Build a `YYYY-MM-DD` key from a Date using *local* components. Using
   * `toISOString()` here would shift the key in any non-UTC timezone (a
   * local midnight on May 12 in CEST is May 11 22:00 UTC), and the resulting
   * cell IDs would not match the visible day numbers.
   */
  static dayKey(d: Date): string {
    return toDayKey(d);
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
    cell.id = `scheduler-cell-m-${key}`;

    // Day number. Clicking it drills into the day, but it is deliberately NOT
    // a focusable control here the way week view's is (audit M9): month renders
    // 35-42 of these, and making each one a tab stop would put that many stops
    // in front of the grid — a worse regression than the gap it closes. The
    // keyboard equivalent for this view is still open; it needs a key on the
    // focused cell, not a tab stop per cell.
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
      // Focus position is expressed by the roving tabindex alone —
      // aria-selected here would misreport focus as selection (audit MAJOR).
      cell.setAttribute('tabindex', isFocused ? '0' : '-1');
      cell.removeAttribute('aria-selected');
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
    const weeks = dateService.getMonthWeeks(date, this.firstDayOfWeek);
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

    // Render events in each day cell.
    // `false` means "show all" — it previously fell into the same `: 3` branch as
    // `true`, so the documented opt-out silently capped at 3 with a "+N more".
    const maxEventsPerDay =
      typeof options.dayMaxEvents === 'number'
        ? options.dayMaxEvents
        : options.dayMaxEvents === false
          ? Number.POSITIVE_INFINITY
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
    // Fill + contrast text, resolving the resource's colour (see BaseView).
    this.applyEventColors(eventEl, event);
        // Tab-reachable like week/day event blocks; focusing selects (the
        // scheduler's handleFocusIn), so no separate activation key is needed.
        eventEl.setAttribute('role', 'button');
        eventEl.setAttribute('tabindex', '0');
        eventEl.setAttribute('aria-label', formatEventAriaLabel(event, null, this.state.options));
        // Month view is the one people open first, and it was the only view whose
        // events announced neither their selection state nor the keymap — so the
        // commands (M/Enter to move, F2 to edit, Delete to remove) all worked and
        // none were discoverable.
        eventEl.setAttribute(
          'aria-pressed',
          String(this.state.selectedEvent?.id === event.id),
        );
        eventEl.setAttribute('aria-describedby', 'scheduler-kbd-event');
        this.setData(eventEl, { eventId: event.id });
        eventsContainer.appendChild(eventEl);
      }

      if (hiddenCount > 0) {
        const moreLink = this.createElement('div', 'scheduler-more-link');
        moreLink.textContent = formatMessage(
          resolveMessages(this.state.options.messages).moreEvents,
          { count: hiddenCount },
        );
        // A real drill-down control: named by its visible text, activated via
        // the scheduler-level Enter/Space handler (it is not a native button
        // because the view builder renders plain nodes).
        moreLink.setAttribute('role', 'button');
        moreLink.setAttribute('tabindex', '0');
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
