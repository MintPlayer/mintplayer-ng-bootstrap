import {
  dateService,
  timelineService,
  SchedulerEvent,
  SchedulerEventPart,
  TimeSlot,
  getContrastColor,
} from '@mintplayer/scheduler-core';
import { BaseView } from './base-view';
import { SchedulerState } from '../state/scheduler-state';

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
        const slotStart = new Date(day);
        slotStart.setHours(
          slotTemplate.start.getHours(),
          slotTemplate.start.getMinutes(),
          0,
          0
        );

        const slotEnd = new Date(day);
        slotEnd.setHours(
          slotTemplate.end.getHours(),
          slotTemplate.end.getMinutes(),
          0,
          0
        );

        const slotEl = this.createElement('div', 'scheduler-time-slot');
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

    // Render now indicator
    this.renderNowIndicator(days, slots);
  }

  update(state: SchedulerState): void {
    this.state = state;

    // Update greyed slots based on drag state
    this.updateGreyedSlots();

    // Re-render events if needed
    this.renderEvents();

    // Render preview event
    this.renderPreviewEvent();
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
    for (const { part, trackIndex, totalTracks } of timelinedParts) {
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
    slotDuration: number
  ): HTMLElement {
    const event = part.event;
    const eventEl = this.createElement('div', 'scheduler-event');

    // Calculate position
    const dayStart = new Date(part.start);
    dayStart.setHours(0, 0, 0, 0);

    const startMinutes =
      (part.start.getTime() - dayStart.getTime()) / (1000 * 60);
    const endMinutes = (part.end.getTime() - dayStart.getTime()) / (1000 * 60);
    const durationMinutes = endMinutes - startMinutes;

    const slotMinutes = slotDuration / 60;
    const top = (startMinutes / slotMinutes) * 40; // 40px per slot
    const height = Math.max((durationMinutes / slotMinutes) * 40, 20);

    // Calculate width based on tracks
    const widthPercent = 100 / totalTracks;
    const leftPercent = trackIndex * widthPercent;

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

  private renderPreviewEvent(): void {
    // Remove existing preview
    const existingPreview = this.container.querySelector('.scheduler-event.preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    const { previewEvent, options, date } = this.state;
    if (!previewEvent) return;

    const days = dateService.getWeekDays(date, options.firstDayOfWeek);
    const dayIndex = days.findIndex((d) => dateService.isSameDay(d, previewEvent.start));
    if (dayIndex === -1) return;

    const dayColumn = this.dayColumns[dayIndex];
    const eventsContainer = dayColumn?.querySelector('.scheduler-events-container');
    if (!eventsContainer) return;

    const previewEl = this.createElement('div', 'scheduler-event', 'preview');

    const dayStart = new Date(previewEvent.start);
    dayStart.setHours(0, 0, 0, 0);

    const startMinutes =
      (previewEvent.start.getTime() - dayStart.getTime()) / (1000 * 60);
    const endMinutes =
      (previewEvent.end.getTime() - dayStart.getTime()) / (1000 * 60);
    const durationMinutes = endMinutes - startMinutes;

    const slotMinutes = (options.slotDuration ?? 1800) / 60;
    const top = (startMinutes / slotMinutes) * 40;
    const height = Math.max((durationMinutes / slotMinutes) * 40, 20);

    previewEl.style.top = `${top}px`;
    previewEl.style.height = `${height}px`;
    previewEl.style.left = '0';
    previewEl.style.width = '100%';

    eventsContainer.appendChild(previewEl);
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

    // Find affected slots
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex];

      if (!dateService.isSameDay(day, previewEvent.start) &&
          !dateService.isSameDay(day, previewEvent.end)) {
        continue;
      }

      for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        const slotTemplate = slots[slotIndex];
        const slotStart = new Date(day);
        slotStart.setHours(
          slotTemplate.start.getHours(),
          slotTemplate.start.getMinutes(),
          0,
          0
        );

        const slotEnd = new Date(day);
        slotEnd.setHours(
          slotTemplate.end.getHours(),
          slotTemplate.end.getMinutes(),
          0,
          0
        );

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

  destroy(): void {
    this.eventElements.clear();
    this.slotElements.clear();
    this.dayColumns = [];
    this.clearContainer();
  }
}
