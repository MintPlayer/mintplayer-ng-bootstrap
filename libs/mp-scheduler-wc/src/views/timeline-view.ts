import {
  dateService,
  timelineService,
  resourceService,
  Resource,
  ResourceGroup,
  SchedulerEvent,
  isResource,
  isResourceGroup,
  FlattenedResource,
  getContrastColor,
} from '@mintplayer/scheduler-core';
import { BaseView } from './base-view';
import { SchedulerState } from '../state/scheduler-state';

/**
 * Timeline view renderer
 */
export class TimelineView extends BaseView {
  private rowElements: Map<string, HTMLElement> = new Map();
  private slotWidth: number = 50;

  render(): void {
    this.clearContainer();
    this.container.classList.add('scheduler-timeline-view');

    const { date, options, resources, collapsedGroups } = this.state;
    const days = dateService.getWeekDays(date, options.firstDayOfWeek);

    // Create timeline structure
    const timeline = this.createElement('div', 'scheduler-timeline');

    // Header
    const header = this.createElement('div', 'scheduler-timeline-header');

    // Resource column header
    const resourceHeader = this.createElement('div', 'scheduler-resource-header');
    resourceHeader.textContent = 'Resources';
    header.appendChild(resourceHeader);

    // Time slots header
    const slotsHeader = this.createElement('div', 'scheduler-timeline-slots-header');

    for (const day of days) {
      const slots = dateService.getTimeSlots(
        day,
        options.slotDuration,
        options.slotMinTime,
        options.slotMaxTime
      );

      // Day header spanning multiple slots
      const daySlots = slots.length;
      const dayHeader = this.createElement('div', 'scheduler-timeline-slot-header');
      dayHeader.style.width = `${daySlots * this.slotWidth}px`;
      dayHeader.textContent = dateService.formatDateWithWeekday(day, options.locale);
      dayHeader.style.borderBottom = '1px solid var(--scheduler-border-color)';
      slotsHeader.appendChild(dayHeader);
    }

    header.appendChild(slotsHeader);
    timeline.appendChild(header);

    // Time labels row
    const timeLabelRow = this.createElement('div', 'scheduler-timeline-header');
    const emptyCell = this.createElement('div', 'scheduler-resource-header');
    emptyCell.style.borderBottom = '1px solid var(--scheduler-border-color)';
    timeLabelRow.appendChild(emptyCell);

    const timeLabelsContainer = this.createElement('div', 'scheduler-timeline-slots-header');

    for (const day of days) {
      const slots = dateService.getTimeSlots(
        day,
        options.slotDuration,
        options.slotMinTime,
        options.slotMaxTime
      );

      for (const slot of slots) {
        const slotHeader = this.createElement('div', 'scheduler-timeline-slot-header');
        slotHeader.style.width = `${this.slotWidth}px`;
        slotHeader.textContent = dateService.formatTime(slot.start, options.timeFormat);
        slotHeader.style.fontSize = '10px';
        timeLabelsContainer.appendChild(slotHeader);
      }
    }

    timeLabelRow.appendChild(timeLabelsContainer);
    timeline.appendChild(timeLabelRow);

    // Body
    const body = this.createElement('div', 'scheduler-timeline-body');

    // Flatten resources
    const flattened = resourceService.flatten(resources, collapsedGroups);

    for (const flat of flattened) {
      if (!flat.visible) continue;

      const row = this.createResourceRow(flat, days);
      body.appendChild(row);
    }

    timeline.appendChild(body);
    this.container.appendChild(timeline);

    // Render events
    this.renderEvents(days);
  }

  private createResourceRow(flat: FlattenedResource, days: Date[]): HTMLElement {
    const { options } = this.state;
    const row = this.createElement('div', 'scheduler-timeline-row');

    if (isResourceGroup(flat.item)) {
      row.classList.add('group');
    }

    // Resource cell
    const resourceCell = this.createElement('div', 'scheduler-resource-cell');
    resourceCell.style.paddingLeft = `${8 + flat.depth * 16}px`;

    if (isResourceGroup(flat.item)) {
      const toggle = this.createElement('span', 'expand-toggle');
      toggle.textContent = this.state.collapsedGroups.has(flat.item.id) ? '▶' : '▼';
      this.setData(toggle, { groupId: flat.item.id });
      resourceCell.appendChild(toggle);
    }

    const title = this.createElement('span');
    title.textContent = flat.item.title;
    resourceCell.appendChild(title);

    row.appendChild(resourceCell);

    // Slots container
    const slotsContainer = this.createElement('div', 'scheduler-timeline-slots');

    for (const day of days) {
      const slots = dateService.getTimeSlots(
        day,
        options.slotDuration,
        options.slotMinTime,
        options.slotMaxTime
      );

      for (const slot of slots) {
        const slotEl = this.createElement('div', 'scheduler-timeline-slot');
        slotEl.style.width = `${this.slotWidth}px`;
        this.setData(slotEl, {
          resourceId: flat.item.id,
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        });
        slotsContainer.appendChild(slotEl);
      }
    }

    // Events container for this row
    if (isResource(flat.item)) {
      const eventsContainer = this.createElement('div', 'scheduler-timeline-events');
      slotsContainer.appendChild(eventsContainer);
    }

    row.appendChild(slotsContainer);
    this.rowElements.set(flat.item.id, row);

    return row;
  }

  private renderEvents(days: Date[]): void {
    const { events, resources, options, collapsedGroups } = this.state;

    const weekStart = days[0];
    const weekEnd = new Date(days[6]);
    weekEnd.setHours(23, 59, 59, 999);

    // Get total slots per day
    const slotsPerDay = dateService.getTimeSlots(
      days[0],
      options.slotDuration,
      options.slotMinTime,
      options.slotMaxTime
    ).length;

    const totalSlots = slotsPerDay * 7;
    const totalWidth = totalSlots * this.slotWidth;

    // Get all resources
    const allResources = resourceService.getAllResources(resources);

    for (const resource of allResources) {
      const row = this.rowElements.get(resource.id);
      if (!row) continue;

      const eventsContainer = row.querySelector('.scheduler-timeline-events');
      if (!eventsContainer) continue;

      // Clear existing events
      eventsContainer.innerHTML = '';

      // Get events for this resource
      const resourceEvents = (resource.events ?? []).filter(
        (e) => e.start < weekEnd && e.end > weekStart
      );

      // Get timeline tracks for this resource's events
      const tracks = timelineService.getTimeline(resourceEvents);

      for (const track of tracks) {
        for (const event of track.events) {
          const eventEl = this.createEventElement(
            event,
            track.index,
            tracks.length,
            weekStart,
            totalWidth,
            options.slotDuration ?? 1800
          );
          eventsContainer.appendChild(eventEl);
        }
      }
    }
  }

  private createEventElement(
    event: SchedulerEvent,
    trackIndex: number,
    totalTracks: number,
    viewStart: Date,
    totalWidth: number,
    slotDuration: number
  ): HTMLElement {
    const eventEl = this.createElement('div', 'scheduler-timeline-event');

    // Clamp event to view bounds
    const eventStart = Math.max(event.start.getTime(), viewStart.getTime());
    const viewEndTime = viewStart.getTime() + 7 * 24 * 60 * 60 * 1000;
    const eventEnd = Math.min(event.end.getTime(), viewEndTime);

    // Calculate position
    const startOffset = eventStart - viewStart.getTime();
    const duration = eventEnd - eventStart;
    const viewDuration = viewEndTime - viewStart.getTime();

    const left = (startOffset / viewDuration) * totalWidth;
    const width = Math.max((duration / viewDuration) * totalWidth, 20);

    // Calculate vertical position based on track
    const trackHeight = 100 / Math.max(totalTracks, 1);
    const top = trackIndex * trackHeight;

    eventEl.style.left = `${left}px`;
    eventEl.style.width = `${width}px`;
    eventEl.style.top = `${top}%`;
    eventEl.style.height = `${trackHeight}%`;
    eventEl.style.backgroundColor = event.color ?? '#3788d8';
    eventEl.style.color = event.textColor ?? getContrastColor(event.color ?? '#3788d8');

    this.setData(eventEl, { eventId: event.id });

    eventEl.textContent = event.title;

    return eventEl;
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
    const days = dateService.getWeekDays(state.date, state.options.firstDayOfWeek);
    this.renderEvents(days);
  }

  private optionsRequireRerender(oldOpts: SchedulerState['options'], newOpts: SchedulerState['options']): boolean {
    return oldOpts.slotDuration !== newOpts.slotDuration ||
           oldOpts.timeFormat !== newOpts.timeFormat ||
           oldOpts.firstDayOfWeek !== newOpts.firstDayOfWeek ||
           oldOpts.slotMinTime !== newOpts.slotMinTime ||
           oldOpts.slotMaxTime !== newOpts.slotMaxTime ||
           oldOpts.locale !== newOpts.locale;
  }

  private updateGreyedSlots(): void {
    const { dragState, previewEvent } = this.state;

    // Clear all greyed slots
    const allSlots = this.container.querySelectorAll('.scheduler-timeline-slot');
    allSlots.forEach((slot) => slot.classList.remove('greyed'));

    if (!dragState || !previewEvent) return;

    // Grey out slots that overlap with the preview
    allSlots.forEach((slot) => {
      const slotStart = new Date((slot as HTMLElement).dataset['start'] ?? '');
      const slotEnd = new Date((slot as HTMLElement).dataset['end'] ?? '');

      if (slotStart < previewEvent.end && slotEnd > previewEvent.start) {
        slot.classList.add('greyed');
      }
    });
  }

  destroy(): void {
    this.rowElements.clear();
    this.clearContainer();
  }
}
