import {
  dateService,
  timelineService,
  SchedulerEventPart,
  getContrastColor,
} from '@mintplayer/scheduler-core';
import { BaseView } from './base-view';
import { SchedulerState } from '../state/scheduler-state';

/**
 * Day view renderer
 */
export class DayView extends BaseView {
  private eventsContainer: HTMLElement | null = null;
  private slotElements: Map<number, HTMLElement> = new Map();

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
    const dayColumn = this.createElement('div', 'scheduler-day-column');

    // Create time slots
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex];
      const slotEl = this.createElement('div', 'scheduler-time-slot');
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

    // Render now indicator
    if (dateService.isToday(date) && options.nowIndicator) {
      this.renderNowIndicator(dayColumn);
    }
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

    // Mark as selected if this is the selected event
    if (this.state.selectedEvent?.id === event.id) {
      eventEl.classList.add('selected');
    }

    // Calculate position
    const dayStart = new Date(part.start);
    dayStart.setHours(0, 0, 0, 0);

    const startMinutes = (part.start.getTime() - dayStart.getTime()) / (1000 * 60);
    const endMinutes = (part.end.getTime() - dayStart.getTime()) / (1000 * 60);
    const durationMinutes = endMinutes - startMinutes;

    const slotMinutes = slotDuration / 60;
    const top = (startMinutes / slotMinutes) * 40;
    const height = Math.max((durationMinutes / slotMinutes) * 40, 20);

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

    // Title
    const title = this.createElement('div', 'event-title');
    title.textContent = event.title;
    eventEl.appendChild(title);

    // Time
    const timeEl = this.createElement('div', 'event-time');
    timeEl.textContent = `${dateService.formatTime(part.start, this.state.options.timeFormat)} - ${dateService.formatTime(part.end, this.state.options.timeFormat)}`;
    eventEl.appendChild(timeEl);

    // Resize handles
    if (event.resizable !== false) {
      if (part.isStart) {
        const topHandle = this.createElement('div', 'resize-handle', 'top');
        this.setData(topHandle, { handle: 'start' });
        eventEl.appendChild(topHandle);
      }
      if (part.isEnd) {
        const bottomHandle = this.createElement('div', 'resize-handle', 'bottom');
        this.setData(bottomHandle, { handle: 'end' });
        eventEl.appendChild(bottomHandle);
      }
    }

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
    if (!dateService.isSameDay(date, previewEvent.start)) return;

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

  private renderPreviewEvent(): void {
    if (!this.eventsContainer) return;

    // Remove existing preview
    const existingPreview = this.eventsContainer.querySelector('.scheduler-event.preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    const { previewEvent, options, date } = this.state;
    if (!previewEvent) return;
    if (!dateService.isSameDay(date, previewEvent.start)) return;

    const previewEl = this.createElement('div', 'scheduler-event', 'preview');

    const dayStart = new Date(previewEvent.start);
    dayStart.setHours(0, 0, 0, 0);

    const startMinutes = (previewEvent.start.getTime() - dayStart.getTime()) / (1000 * 60);
    const endMinutes = (previewEvent.end.getTime() - dayStart.getTime()) / (1000 * 60);
    const durationMinutes = endMinutes - startMinutes;

    const slotMinutes = (options.slotDuration ?? 1800) / 60;
    const top = (startMinutes / slotMinutes) * 40;
    const height = Math.max((durationMinutes / slotMinutes) * 40, 20);

    previewEl.style.top = `${top}px`;
    previewEl.style.height = `${height}px`;
    previewEl.style.left = '0';
    previewEl.style.width = '100%';

    this.eventsContainer.appendChild(previewEl);
  }

  destroy(): void {
    this.eventsContainer = null;
    this.slotElements.clear();
    this.clearContainer();
  }
}
