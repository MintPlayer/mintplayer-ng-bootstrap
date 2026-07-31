import {
  dateService,
  timelineService,
  SchedulerEventPart,
  getContrastColor,
} from '@mintplayer/web-components/scheduler-core';
import { BaseView, formatEventAriaLabel, isSlotInSelection } from './base-view';
import { SchedulerState } from '../state/scheduler-state';

/**
 * Day view renderer
 */
export class DayView extends BaseView {
  private eventsContainer: HTMLElement | null = null;
  private slotElements: Map<number, HTMLElement> = new Map();
  private dayColumn: HTMLElement | null = null;

  render(): void {
    this.clearContainer();
    this.container.classList.add('scheduler-day-view');

    const { date, options } = this.state;

    // Day header
    const header = this.createElement('div', 'scheduler-day-headers');

    // Time gutter space
    const gutterSpace = this.createElement('div', 'scheduler-time-gutter-space');
    gutterSpace.style.width = 'var(--scheduler-time-gutter-width)';
    header.appendChild(gutterSpace);

    const dayHeader = this.createElement('div', 'scheduler-day-header');
    if (dateService.isToday(date)) {
      dayHeader.classList.add('today');
    }

    const dayName = this.createElement('div', 'day-name');
    dayName.textContent = dateService.getDayName(date, options.locale);

    const dayNumber = this.createElement('div', 'day-number');
    dayNumber.textContent = String(date.getDate());

    const monthYear = this.createElement('div', 'month-year');
    monthYear.textContent = dateService.formatDate(date, options.locale, {
      month: 'long',
      year: 'numeric',
    });
    monthYear.style.fontSize = '12px';
    monthYear.style.color = '#666';

    dayHeader.appendChild(dayName);
    dayHeader.appendChild(dayNumber);
    dayHeader.appendChild(monthYear);
    header.appendChild(dayHeader);
    this.container.appendChild(header);

    // Time grid
    const timeGrid = this.createElement('div', 'scheduler-time-grid');

    // Time gutter
    const timeGutter = this.createElement('div', 'scheduler-time-gutter');
    const slots = dateService.getTimeSlots(
      date,
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

    // Day column
    const daysContainer = this.createElement('div', 'scheduler-days-container');
    this.dayColumn = this.createElement('div', 'scheduler-day-column');
    const dayColumn = this.dayColumn;

    // Create time slots
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex];
      const slotEl = this.createElement('div', 'scheduler-time-slot');
      slotEl.setAttribute('role', 'gridcell');
      slotEl.setAttribute('tabindex', '-1');
      slotEl.setAttribute('aria-selected', 'false');
      slotEl.id = `scheduler-cell-d-${slotIndex}`;
      this.setData(slotEl, {
        slotIndex,
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      });
      this.slotElements.set(slotIndex, slotEl);
      dayColumn.appendChild(slotEl);
    }

    // Events container
    this.eventsContainer = this.createElement('div', 'scheduler-events-container');
    dayColumn.appendChild(this.eventsContainer);

    daysContainer.appendChild(dayColumn);
    timeGrid.appendChild(daysContainer);
    this.container.appendChild(timeGrid);

    // Render events
    this.renderEvents();

    // Reflect any pre-existing focused cell / selection.
    this.updateCellFocusAndSelection();

    // Render now indicator
    if (dateService.isToday(date) && options.nowIndicator) {
      this.renderNowIndicator(dayColumn);
    }

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

  /**
   * Apply roving tabindex + aria-selected + `.selected` class to each cached
   * slot element based on focusedCell and selection range.
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
    // Fallback so the grid is always Tab-reachable (see week-view note).
    if (!foundFocused && firstEl) firstEl.setAttribute('tabindex', '0');
  }

  private renderEvents(): void {
    if (!this.eventsContainer) return;
    this.eventsContainer.innerHTML = '';

    const { date, events, options } = this.state;
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Filter events for this day
    const dayEvents = timelineService.filterByRange(events, dayStart, dayEnd);

    // Split events into parts
    const allParts: SchedulerEventPart[] = [];
    for (const event of dayEvents) {
      const { parts } = timelineService.splitInParts(event);
      const dayParts = timelineService.filterPartsByRange(parts, dayStart, dayEnd);
      allParts.push(...dayParts);
    }

    // Get timelened parts with track info
    const timelinedParts = timelineService.getTimelinedParts(allParts);

    // Render each event part
    for (const { part, trackIndex, totalTracks, colspan } of timelinedParts) {
      if (!part.event) continue;

      const eventEl = this.createEventElement(
        part,
        trackIndex,
        totalTracks,
        colspan,
        options.slotDuration ?? 1800
      );
      this.eventsContainer.appendChild(eventEl);
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
    // Every event is Tab-reachable (PRD §6.1).
    eventEl.setAttribute('tabindex', '0');
    eventEl.setAttribute(
      'aria-label',
      formatEventAriaLabel(event, null, this.state.options),
    );
    // Selection state on the button token that supports it (see week-view).
    eventEl.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    // Move/resize discoverability hint (FR-9) — read by SRs on focus.
    eventEl.setAttribute('aria-describedby', 'scheduler-kbd-event');
    if (isSelected) eventEl.classList.add('selected');
    void inMoveMode;

    // Shared geometry: honours slotMinTime and keeps the box and its drag ghost
    // measuring from the same origin (see BaseView.partGeometry).
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
    // Fill + contrast text, resolving the resource's colour (see BaseView).
    this.applyEventColors(eventEl, event);

    this.setData(eventEl, { eventId: event.id });

    // Content wrapper clips text independently of the event box, which stays
    // overflow: visible so the selected-state resize handles/glyphs can
    // straddle the top/bottom edges (see week-view).
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

  private renderNowIndicator(dayColumn: HTMLElement): void {
    const now = new Date();
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
    if (!this.dayColumn) return;
    if (!this.state.options.nowIndicator) return;
    if (!dateService.isToday(this.state.date)) return;

    // Find existing indicator
    const existingIndicator = this.dayColumn.querySelector('.scheduler-now-indicator');

    // Calculate new position
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const minutesFromMidnight = (now.getTime() - dayStart.getTime()) / (1000 * 60);
    const slotMinutes = (this.state.options.slotDuration ?? 1800) / 60;
    const top = (minutesFromMidnight / slotMinutes) * 40;

    if (existingIndicator) {
      // Update position of existing indicator
      (existingIndicator as HTMLElement).style.top = `${top}px`;
    } else {
      // Create new indicator if it doesn't exist
      this.renderNowIndicator(this.dayColumn);
    }
  }

  update(state: SchedulerState): void {
    const dateChanged = this.state.date.getTime() !== state.date.getTime();
    const optionsChanged = this.optionsRequireRerender(this.state.options, state.options);
    this.state = state;

    // If date or relevant options changed, we need to re-render the entire view
    if (dateChanged || optionsChanged) {
      this.render();
      return;
    }

    // Update greyed slots
    this.updateGreyedSlots();

    // Re-render events
    this.renderEvents();

    // Refresh cell focus + selection styling.
    this.updateCellFocusAndSelection();

    // Render preview event
    this.renderPreviewEvent();
  }

  private optionsRequireRerender(oldOpts: SchedulerState['options'], newOpts: SchedulerState['options']): boolean {
    return oldOpts.slotDuration !== newOpts.slotDuration ||
           oldOpts.timeFormat !== newOpts.timeFormat ||
           oldOpts.slotMinTime !== newOpts.slotMinTime ||
           oldOpts.slotMaxTime !== newOpts.slotMaxTime ||
           oldOpts.locale !== newOpts.locale;
  }

  private updateGreyedSlots(): void {
    const { dragState, previewEvent, options, date } = this.state;

    // Clear all greyed slots
    this.slotElements.forEach((el) => el.classList.remove('greyed'));

    if (!dragState || !previewEvent) return;
    // No same-day bail: the overlap test below clips correctly, whereas bailing
    // greyed nothing when a range ran in from the previous day.

    const slots = dateService.getTimeSlots(
      date,
      options.slotDuration,
      options.slotMinTime,
      options.slotMaxTime
    );

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex];

      // Check if slot overlaps with preview event
      if (slot.start < previewEvent.end && slot.end > previewEvent.start) {
        const slotEl = this.slotElements.get(slotIndex);
        if (slotEl) {
          slotEl.classList.add('greyed');
        }
      }
    }
  }

  /**
   * Dashed ghost for the day currently shown. A multi-day range contributes at
   * most one part here, but it must still be CLIPPED to this day rather than
   * skipped: bailing unless the range *started* today meant dragging in from
   * yesterday drew no feedback at all.
   */
  private renderPreviewEvent(): void {
    if (!this.eventsContainer) return;

    this.eventsContainer
      .querySelectorAll('.scheduler-event.preview')
      .forEach((el) => el.remove());

    const { previewEvent, options, date } = this.state;
    if (!previewEvent) return;

    const { parts } = timelineService.splitInParts(previewEvent);
    const part = parts.find((p) => dateService.isSameDay(date, p.start));
    if (!part) return;

    const geometry = this.partGeometry(part.start, part.end, options);
    if (!geometry) return;

    const previewEl = this.createElement('div', 'scheduler-event', 'preview');
    if (!part.isStart) previewEl.classList.add('preview-continues-before');
    if (!part.isEnd) previewEl.classList.add('preview-continues-after');
    previewEl.style.top = `${geometry.top}px`;
    previewEl.style.height = `${geometry.height}px`;
    previewEl.style.left = '0';
    previewEl.style.width = '100%';

    this.eventsContainer.appendChild(previewEl);
  }

  destroy(): void {
    this.eventsContainer = null;
    this.dayColumn = null;
    this.slotElements.clear();
    this.clearContainer();
  }
}
