import {
  dateService,
  timelineService,
  SchedulerEvent,
  SchedulerEventPart,
  TimeSlot,
  getContrastColor,
} from '@mintplayer/web-components/scheduler-core';
import { BaseView, formatEventAriaLabel, isSlotInSelection } from './base-view';
import { SchedulerState } from '../state/scheduler-state';

/**
 * Move a slot template (generated for one reference day) onto `day`, preserving
 * its offset from midnight and its duration.
 *
 * Deliberately arithmetic rather than `setHours(template.getHours(), …)`: the
 * last template of a day ends at the NEXT day's 00:00, so reading its hours
 * yields 0 and produces an `end` before its own `start`.
 */
function rebaseSlotOntoDay(template: TimeSlot, day: Date): { start: Date; end: Date } {
  const templateMidnight = new Date(template.start);
  templateMidnight.setHours(0, 0, 0, 0);
  const offsetMs = template.start.getTime() - templateMidnight.getTime();
  const durationMs = template.end.getTime() - template.start.getTime();

  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime() + offsetMs;
  return { start: new Date(startMs), end: new Date(startMs + durationMs) };
}

/**
 * Week view renderer
 */
export class WeekView extends BaseView {
  private dayColumns: HTMLElement[] = [];
  private eventElements: Map<string, HTMLElement> = new Map();
  private slotElements: Map<string, HTMLElement> = new Map();

  render(): void {
    this.clearContainer();
    this.container.classList.add('scheduler-week-view');

    const { date, options } = this.state;
    const days = dateService.getWeekDays(date, options.firstDayOfWeek);

    // Create day headers
    const headers = this.createElement('div', 'scheduler-day-headers');

    // Add time gutter space
    const gutterSpace = this.createElement('div', 'scheduler-time-gutter-space');
    gutterSpace.style.width = 'var(--scheduler-time-gutter-width)';
    headers.appendChild(gutterSpace);

    for (const day of days) {
      const header = this.createElement('div', 'scheduler-day-header');
      if (dateService.isToday(day)) {
        header.classList.add('today');
      }

      const dayName = this.createElement('div', 'day-name');
      dayName.textContent = dateService.getDayName(day, options.locale);

      const dayNumber = this.createElement('div', 'day-number');
      dayNumber.textContent = String(day.getDate());

      header.appendChild(dayName);
      header.appendChild(dayNumber);
      headers.appendChild(header);
    }

    this.container.appendChild(headers);

    // Create time grid
    const timeGrid = this.createElement('div', 'scheduler-time-grid');

    // Time gutter
    const timeGutter = this.createElement('div', 'scheduler-time-gutter');
    const slots = dateService.getTimeSlots(
      days[0],
      options.slotDuration,
      options.slotMinTime,
      options.slotMaxTime
    );

    for (const slot of slots) {
      const label = this.createElement('div', 'scheduler-time-slot-label');
      label.textContent = dateService.formatTime(slot.start, options.timeFormat);
      timeGutter.appendChild(label);
    }

    timeGrid.appendChild(timeGutter);

    // Days container
    const daysContainer = this.createElement('div', 'scheduler-days-container');
    this.dayColumns = [];

    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex];
      const dayColumn = this.createElement('div', 'scheduler-day-column');
      this.setData(dayColumn, { dayIndex });

      // Create time slots
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        const slotTemplate = slots[slotIndex];
        // Rebase by ELAPSED TIME from the template's own midnight. Using
        // getHours() broke the day's last slot: its template end is next-day
        // 00:00, so getHours() returned 0 and the stamped `end` landed 23.5h
        // before its own `start`, collapsing any create-drag that reached the
        // bottom row.
        const { start: slotStart, end: slotEnd } = rebaseSlotOntoDay(slotTemplate, day);

        const slotEl = this.createElement('div', 'scheduler-time-slot');
        slotEl.setAttribute('role', 'gridcell');
        slotEl.setAttribute('tabindex', '-1');
        slotEl.setAttribute('aria-selected', 'false');
        slotEl.id = `scheduler-cell-w-${dayIndex}-${slotIndex}`;
        this.setData(slotEl, {
          dayIndex,
          slotIndex,
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });

        const key = `${dayIndex}-${slotIndex}`;
        this.slotElements.set(key, slotEl);
        dayColumn.appendChild(slotEl);
      }

      // Events container for this day
      const eventsContainer = this.createElement('div', 'scheduler-events-container');
      dayColumn.appendChild(eventsContainer);

      this.dayColumns.push(dayColumn);
      daysContainer.appendChild(dayColumn);
    }

    timeGrid.appendChild(daysContainer);
    this.container.appendChild(timeGrid);

    // Render events
    this.renderEvents();

    // Reflect any pre-existing focused cell / selection (e.g. after view switch).
    this.updateCellFocusAndSelection();

    // Render now indicator
    this.renderNowIndicator(days, slots);

    this.applyGridRoles({
      multiselectable: true,
      columnHeaderRow: ':scope > .scheduler-day-headers',
      columnHeaders: '.scheduler-day-headers > .scheduler-day-header',
      presentation: [
        '.scheduler-time-gutter-space',
        '.scheduler-time-grid',
        '.scheduler-time-gutter',
        '.scheduler-time-slot-label',
        '.scheduler-days-container',
      ],
      rows: '.scheduler-day-column',
      // The events overlay is a CELL, not presentation: a presentational
      // wrapper leaves its role=button events owned directly by the row,
      // which is invalid (axe aria-required-children). A gridcell may
      // contain buttons.
      cells: '.scheduler-events-container',
    });
    this.markToday();
  }

  update(state: SchedulerState): void {
    const dateChanged = this.state.date.getTime() !== state.date.getTime();
    const optionsChanged = this.optionsRequireRerender(this.state.options, state.options);
    const selectionChanged = this.state.selectedEvent?.id !== state.selectedEvent?.id;
    this.state = state;

    // If date or relevant options changed, we need to re-render the entire view
    if (dateChanged || optionsChanged) {
      this.render();
      return;
    }

    // Update greyed slots based on drag state
    this.updateGreyedSlots();

    // Re-render events if selection changed or needed
    if (selectionChanged) {
      this.renderEvents();
    } else {
      this.renderEvents();
    }

    // Reflect focusedCell + selection range into per-slot ARIA + tabindex.
    this.updateCellFocusAndSelection();

    // Render preview event
    this.renderPreviewEvent();
  }

  /**
   * Apply roving tabindex and aria-selected to each cached slot element. Also
   * toggles the `.selected` class so the existing `.scheduler-time-slot.selected`
   * styling lights up cells in the keyboard-driven range. A linear time-range
   * selection (PRD D1) lights up every slot whose [start, end) intersects
   * the range, including across day boundaries on week view.
   */
  private updateCellFocusAndSelection(): void {
    const focused = this.state.focusedCell;
    let foundFocused = false;
    let firstEl: HTMLElement | null = null;
    for (const [, slotEl] of this.slotElements) {
      if (!firstEl) firstEl = slotEl;
      const startStr = slotEl.dataset['start'];
      const endStr = slotEl.dataset['end'];
      if (!startStr || !endStr) continue;
      const slot = { start: new Date(startStr), end: new Date(endStr) };
      const isFocused =
        !!focused && slot.start.getTime() === focused.start.getTime();
      slotEl.setAttribute('tabindex', isFocused ? '0' : '-1');
      const inSelection = isSlotInSelection(slot, this.state, null);
      slotEl.setAttribute('aria-selected', inSelection ? 'true' : 'false');
      slotEl.classList.toggle('selected', inSelection);
      if (isFocused) foundFocused = true;
    }
    // Grid must be Tab-reachable: if focusedCell hasn't been set yet (first
    // mount, or focused cell isn't visible after a date change), fall back
    // to the top-left cell so Tab from the header lands somewhere.
    if (!foundFocused && firstEl) firstEl.setAttribute('tabindex', '0');
  }

  private optionsRequireRerender(oldOpts: SchedulerState['options'], newOpts: SchedulerState['options']): boolean {
    return oldOpts.slotDuration !== newOpts.slotDuration ||
           oldOpts.timeFormat !== newOpts.timeFormat ||
           oldOpts.firstDayOfWeek !== newOpts.firstDayOfWeek ||
           oldOpts.slotMinTime !== newOpts.slotMinTime ||
           oldOpts.slotMaxTime !== newOpts.slotMaxTime ||
           oldOpts.locale !== newOpts.locale;
  }

  private renderEvents(): void {
    const { date, events, options } = this.state;
    const days = dateService.getWeekDays(date, options.firstDayOfWeek);
    const weekStart = days[0];
    const weekEnd = new Date(days[6]);
    weekEnd.setHours(23, 59, 59, 999);

    // Filter events for this week
    const weekEvents = timelineService.filterByRange(events, weekStart, weekEnd);

    // Split events into parts and get timeline
    const allParts: SchedulerEventPart[] = [];
    for (const event of weekEvents) {
      const { parts } = timelineService.splitInParts(event);
      allParts.push(...parts);
    }

    // Filter parts for this week
    const weekParts = timelineService.filterPartsByRange(allParts, weekStart, weekEnd);

    // Get timelened parts with track info
    const timelinedParts = timelineService.getTimelinedParts(weekParts);

    // Clear existing events
    this.eventElements.forEach((el) => el.remove());
    this.eventElements.clear();

    // Render each event part
    for (const { part, trackIndex, totalTracks, colspan } of timelinedParts) {
      if (!part.event) continue;

      const dayIndex = days.findIndex((d) => dateService.isSameDay(d, part.start));
      if (dayIndex === -1) continue;

      const dayColumn = this.dayColumns[dayIndex];
      const eventsContainer = dayColumn.querySelector('.scheduler-events-container');
      if (!eventsContainer) continue;

      const eventEl = this.createEventElement(
        part,
        trackIndex,
        totalTracks,
        colspan,
        options.slotDuration ?? 1800
      );

      eventsContainer.appendChild(eventEl);
      this.eventElements.set(part.id, eventEl);
    }
  }

  private createEventElement(
    part: SchedulerEventPart,
    trackIndex: number,
    totalTracks: number,
    colspan: number,
    slotDuration: number
  ): HTMLElement {
    const event = part.event;
    const eventEl = this.createElement('div', 'scheduler-event');
    const isSelected = this.state.selectedEvent?.id === event.id;
    const inMoveMode = this.state.keyboardMoveEventId === event.id;
    eventEl.setAttribute('role', 'button');
    // Every event is in the Tab order (PRD §6.1) — Tab cycles through events
    // in document order.
    eventEl.setAttribute('tabindex', '0');
    eventEl.setAttribute(
      'aria-label',
      formatEventAriaLabel(event, null, this.state.options),
    );
    // aria-pressed is the button's SELECTION state, always written (a missing
    // token reads as not-a-toggle). aria-current was the wrong token for
    // selection, and aria-selected is invalid on role="button"; move mode is
    // a transient mode announced by the live region, not an attribute.
    eventEl.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    // Move/resize discoverability hint (FR-9) — read by SRs on focus.
    eventEl.setAttribute('aria-describedby', 'scheduler-kbd-event');
    if (isSelected) eventEl.classList.add('selected');
    void inMoveMode;

    // Vertical geometry comes from the shared helper so the box and its drag
    // ghost can never disagree, and so slotMinTime is honoured (see BaseView).
    const geometry = this.partGeometry(part.start, part.end, {
      ...this.state.options,
      slotDuration,
    });
    const { top, height } = geometry ?? { top: 0, height: 0 };

    // Calculate width based on tracks and colspan
    // colspan allows events to span multiple columns when there's no blocking event
    const leftPercent = (trackIndex / totalTracks) * 100;
    const widthPercent = (colspan / totalTracks) * 100;

    eventEl.style.top = `${top}px`;
    eventEl.style.height = `${height}px`;
    eventEl.style.left = `${leftPercent}%`;
    eventEl.style.width = `calc(${widthPercent}% - 2px)`;
    eventEl.style.backgroundColor = event.color ?? '#3788d8';
    eventEl.style.color = event.textColor ?? getContrastColor(event.color ?? '#3788d8');

    this.setData(eventEl, { eventId: event.id });

    // Content wrapper clips text independently of the event box, which stays
    // overflow: visible so the selected-state resize handles/glyphs can
    // straddle the top/bottom edges.
    const content = this.createElement('div', 'event-content');

    const title = this.createElement('div', 'event-title');
    title.textContent = event.title;
    content.appendChild(title);

    const timeEl = this.createElement('div', 'event-time');
    timeEl.textContent = `${dateService.formatTime(part.start, this.state.options.timeFormat)} - ${dateService.formatTime(part.end, this.state.options.timeFormat)}`;
    content.appendChild(timeEl);

    eventEl.appendChild(content);

    this.appendResizeHandles(eventEl, part);

    return eventEl;
  }

  /**
   * Dashed ghost showing where the dragged/created range will land — ONE box per
   * day it spans, mirroring how a committed multi-day event splits into parts.
   * A single box measured from the start day's midnight produced a ~2900px-tall
   * box hanging out of the first column for a 3-day range.
   */
  private renderPreviewEvent(): void {
    // querySelectorAll: there are now N ghosts, one per spanned day.
    this.container
      .querySelectorAll('.scheduler-event.preview')
      .forEach((el) => el.remove());

    const { previewEvent, options, date } = this.state;
    if (!previewEvent) return;

    const days = dateService.getWeekDays(date, options.firstDayOfWeek);
    // splitInParts already accepts a PreviewEvent and flags isStart/isEnd, so the
    // ghost reuses exactly the machinery committed events use.
    const { parts } = timelineService.splitInParts(previewEvent);

    for (const part of parts) {
      const dayIndex = days.findIndex((d) => dateService.isSameDay(d, part.start));
      // `continue`, never `return`: a range nudged past the week edge must still
      // draw the parts that ARE visible instead of losing all feedback.
      if (dayIndex === -1) continue;

      const eventsContainer =
        this.dayColumns[dayIndex]?.querySelector('.scheduler-events-container');
      if (!eventsContainer) continue;

      const geometry = this.partGeometry(part.start, part.end, options);
      if (!geometry) continue; // clipped entirely outside the visible window

      const previewEl = this.createElement('div', 'scheduler-event', 'preview');
      // Seam classes let the SCSS drop the borders on midnight joins so a
      // multi-day range reads as one range rather than N separate events.
      if (!part.isStart) previewEl.classList.add('preview-continues-before');
      if (!part.isEnd) previewEl.classList.add('preview-continues-after');
      previewEl.style.top = `${geometry.top}px`;
      previewEl.style.height = `${geometry.height}px`;
      previewEl.style.left = '0';
      previewEl.style.width = '100%';

      eventsContainer.appendChild(previewEl);
    }
  }

  private updateGreyedSlots(): void {
    const { dragState, previewEvent, options, date } = this.state;

    // Clear all greyed slots
    this.slotElements.forEach((el) => el.classList.remove('greyed'));

    if (!dragState || !previewEvent) return;

    const days = dateService.getWeekDays(date, options.firstDayOfWeek);
    const slots = dateService.getTimeSlots(
      days[0],
      options.slotDuration,
      options.slotMinTime,
      options.slotMaxTime
    );

    // Find affected slots. No day filter: the overlap test below is already
    // multi-day-correct, whereas filtering to "start day or end day" greyed
    // nothing on the middle days of a 3+ day range.
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex];

      for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        const slotTemplate = slots[slotIndex];
        const { start: slotStart, end: slotEnd } = rebaseSlotOntoDay(slotTemplate, day);

        // Check if slot overlaps with preview event
        if (slotStart < previewEvent.end && slotEnd > previewEvent.start) {
          const key = `${dayIndex}-${slotIndex}`;
          const slotEl = this.slotElements.get(key);
          if (slotEl) {
            slotEl.classList.add('greyed');
          }
        }
      }
    }
  }

  private renderNowIndicator(days: Date[], slots: TimeSlot[]): void {
    if (!this.state.options.nowIndicator) return;

    const now = new Date();
    const todayIndex = days.findIndex((d) => dateService.isSameDay(d, now));
    if (todayIndex === -1) return;

    const dayColumn = this.dayColumns[todayIndex];
    if (!dayColumn) return;

    // Calculate position
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const minutesFromMidnight = (now.getTime() - dayStart.getTime()) / (1000 * 60);
    const slotMinutes = (this.state.options.slotDuration ?? 1800) / 60;
    const top = (minutesFromMidnight / slotMinutes) * 40;

    const indicator = this.createElement('div', 'scheduler-now-indicator');
    indicator.style.top = `${top}px`;
    dayColumn.appendChild(indicator);
  }

  override updateNowIndicator(): void {
    if (!this.state.options.nowIndicator) return;

    const { date, options } = this.state;
    const days = dateService.getWeekDays(date, options.firstDayOfWeek);

    const now = new Date();
    const todayIndex = days.findIndex((d) => dateService.isSameDay(d, now));
    if (todayIndex === -1) return;

    const dayColumn = this.dayColumns[todayIndex];
    if (!dayColumn) return;

    // Find existing indicator
    const existingIndicator = dayColumn.querySelector('.scheduler-now-indicator');

    // Calculate new position
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const minutesFromMidnight = (now.getTime() - dayStart.getTime()) / (1000 * 60);
    const slotMinutes = (options.slotDuration ?? 1800) / 60;
    const top = (minutesFromMidnight / slotMinutes) * 40;

    if (existingIndicator) {
      // Update position of existing indicator
      (existingIndicator as HTMLElement).style.top = `${top}px`;
    } else {
      // Create new indicator if it doesn't exist
      const indicator = this.createElement('div', 'scheduler-now-indicator');
      indicator.style.top = `${top}px`;
      dayColumn.appendChild(indicator);
    }
  }

  destroy(): void {
    this.eventElements.clear();
    this.slotElements.clear();
    this.dayColumns = [];
    this.clearContainer();
  }
}
