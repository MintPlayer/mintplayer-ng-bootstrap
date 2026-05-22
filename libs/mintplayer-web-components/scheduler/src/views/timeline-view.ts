import { dateService, timelineService, resourceService, Resource, ResourceGroup, SchedulerEvent, SchedulerEventPart, isResource, isResourceGroup, FlattenedResource, getContrastColor } from '@mintplayer/web-components/scheduler-core';
import { BaseView, formatEventAriaLabel, isSlotInSelection } from './base-view';
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
    const flattenedPreview = resourceService.flatten(resources, collapsedGroups);
    const visibleRowCount = flattenedPreview.filter((f) => f.visible).length + 1; // +1 for the day-header row

    // Create timeline structure with role=grid (APG Grid pattern, PRD §10 Q5)
    const timeline = this.createElement('div', 'scheduler-timeline');
    timeline.setAttribute('role', 'grid');
    timeline.setAttribute(
      'aria-label',
      `Resource timeline for week starting ${dateService.formatDateWithWeekday(days[0], options.locale)}`,
    );
    timeline.setAttribute('aria-rowcount', String(visibleRowCount));

    // Header (row containing day labels)
    const header = this.createElement('div', 'scheduler-timeline-header');
    header.setAttribute('role', 'row');
    header.setAttribute('aria-rowindex', '1');

    // Resource column header (top-left corner)
    const resourceHeader = this.createElement('div', 'scheduler-resource-header');
    resourceHeader.setAttribute('role', 'columnheader');
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
      dayHeader.setAttribute('role', 'columnheader');
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
        slotHeader.setAttribute('role', 'columnheader');
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

    let rowIndex = 2; // 1 = header row above
    for (const flat of flattened) {
      if (!flat.visible) continue;

      const row = this.createResourceRow(flat, days);
      row.setAttribute('aria-rowindex', String(rowIndex));
      body.appendChild(row);
      rowIndex++;
    }

    timeline.appendChild(body);
    this.container.appendChild(timeline);

    // Render events
    this.renderEvents(days);

    // Reflect any pre-existing focused cell / selection.
    this.updateCellFocusAndSelection();
  }

  /**
   * Apply roving tabindex + aria-selected + `.selected` class to each
   * timeline-slot element. Selection is constrained to the resource pinned
   * at the anchor (PRD D1: cross-resource selection ignored).
   */
  private updateCellFocusAndSelection(): void {
    const focused = this.state.focusedCell;
    const focusedResourceId = this.state.focusedResourceId;
    const slots = this.container.querySelectorAll<HTMLElement>('.scheduler-timeline-slot');
    let foundFocused = false;
    let firstEl: HTMLElement | null = null;
    slots.forEach((slotEl) => {
      if (!firstEl) firstEl = slotEl;
      const startStr = slotEl.dataset['start'];
      const endStr = slotEl.dataset['end'];
      const resourceId = slotEl.dataset['resourceId'] ?? null;
      if (!startStr || !endStr) return;
      const slot = { start: new Date(startStr), end: new Date(endStr) };
      const isFocused =
        !!focused &&
        slot.start.getTime() === focused.start.getTime() &&
        focusedResourceId === resourceId;
      slotEl.setAttribute('tabindex', isFocused ? '0' : '-1');
      const inSelection = isSlotInSelection(slot, this.state, resourceId);
      slotEl.setAttribute('aria-selected', inSelection ? 'true' : 'false');
      slotEl.classList.toggle('selected', inSelection);
      if (isFocused) foundFocused = true;
    });
    if (!foundFocused && firstEl) (firstEl as HTMLElement).setAttribute('tabindex', '0');
  }

  private createResourceRow(flat: FlattenedResource, days: Date[]): HTMLElement {
    const { options } = this.state;
    const row = this.createElement('div', 'scheduler-timeline-row');
    row.setAttribute('role', 'row');

    if (isResourceGroup(flat.item)) {
      row.classList.add('group');
    }

    // Resource cell — role="rowheader" labels the row for SR users.
    const resourceCell = this.createElement('div', 'scheduler-resource-cell');
    resourceCell.setAttribute('role', 'rowheader');
    resourceCell.style.paddingLeft = `${8 + flat.depth * 16}px`;

    if (isResourceGroup(flat.item)) {
      // Native <button> for the expand/collapse — gets keyboard activation
      // (Enter/Space) for free, plus aria-expanded reflects collapsed state.
      const toggle = this.createElement('button', 'expand-toggle');
      toggle.type = 'button';
      const isCollapsed = this.state.collapsedGroups.has(flat.item.id);
      toggle.textContent = isCollapsed ? '▶' : '▼';
      toggle.setAttribute('aria-expanded', String(!isCollapsed));
      toggle.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} ${flat.item.title}`);
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
        slotEl.setAttribute('role', 'gridcell');
        slotEl.setAttribute('tabindex', '-1');
        slotEl.setAttribute('aria-selected', 'false');
        slotEl.id = `scheduler-cell-t-${flat.item.id}-${slot.start.getTime()}`;
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

      // Create event parts for layout (don't split into daily parts for timeline view)
      // For timeline view, treat each event as a single entity for layout purposes
      const allParts: SchedulerEventPart[] = resourceEvents.map((event) => ({
        id: event.id,
        event: event,
        start: event.start,
        end: event.end,
        isStart: true,
        isEnd: true,
        dayIndex: 0,
        totalDays: 1,
      }));

      // Get timelened parts with track info (uses colspan algorithm)
      const timelinedParts = timelineService.getTimelinedParts(allParts);

      // Render each event part
      for (const { part, trackIndex, totalTracks, colspan } of timelinedParts) {
        if (!part.event) continue;

        const eventEl = this.createEventElement(
          part.event,
          trackIndex,
          totalTracks,
          colspan,
          weekStart,
          totalWidth,
          options.slotDuration ?? 1800,
          resource.title,
        );
        eventsContainer.appendChild(eventEl);
      }
    }
  }

  private createEventElement(
    event: SchedulerEvent,
    trackIndex: number,
    totalTracks: number,
    colspan: number,
    viewStart: Date,
    totalWidth: number,
    slotDuration: number,
    resourceTitle: string | null = null,
  ): HTMLElement {
    const eventEl = this.createElement('div', 'scheduler-timeline-event');
    const isSelected = this.state.selectedEvent?.id === event.id;
    const inMoveMode = this.state.keyboardMoveEventId === event.id;
    eventEl.setAttribute('role', 'button');
    // Every event is Tab-reachable (PRD §6.1) — flipped from roving tabindex
    // so users can Tab through events in document order.
    eventEl.setAttribute('tabindex', '0');
    eventEl.setAttribute(
      'aria-label',
      formatEventAriaLabel(event, resourceTitle, this.state.options.timeFormat),
    );
    if (inMoveMode) eventEl.setAttribute('aria-pressed', 'true');
    if (isSelected) {
      eventEl.setAttribute('aria-current', 'true');
      eventEl.classList.add('selected');
    }

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

    // Calculate vertical position based on track and colspan
    // colspan allows events to span multiple tracks when there's no blocking event
    const top = (trackIndex / totalTracks) * 100;
    const heightPercent = (colspan / totalTracks) * 100;

    eventEl.style.left = `${left}px`;
    eventEl.style.width = `${width}px`;
    eventEl.style.top = `${top}%`;
    eventEl.style.height = `${heightPercent}%`;
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

    // Refresh cell focus + selection styling.
    this.updateCellFocusAndSelection();
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
