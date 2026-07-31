import {
  SchedulerCustomEvent,
  EventDetail,
  TimeRange,
  ViewType,
  Resource,
  ResourceGroup,
} from '@mintplayer/web-components/scheduler-core';

/**
 * Handles dispatching custom events from the scheduler.
 * Centralizes event emission logic for consistency.
 */
export class SchedulerEventEmitter {
  constructor(private readonly host: HTMLElement) {}

  /**
   * Emit a scheduler custom event. `composed` as well as `bubbles`: without it
   * the event stops at the shadow boundary of any component the scheduler is
   * nested inside, so a wrapper-of-a-wrapper never sees it.
   */
  emit(event: SchedulerCustomEvent): void {
    const { type, ...detail } = event;
    this.host.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Emit an event-selected event. Fired both by mouse click and by keyboard
   * Tab landing on an event (mouse-parity, PRD scheduler-keyboard-grid-nav D3).
   */
  emitEventSelected(
    event: EventDetail<'event-selected'>['event'],
    originalEvent: Event
  ): void {
    this.emit({ type: 'event-selected', event, originalEvent });
  }

  /**
   * Emit an event-dblclick event.
   */
  emitEventDblClick(
    event: EventDetail<'event-dblclick'>['event'],
    originalEvent: Event
  ): void {
    this.emit({ type: 'event-dblclick', event, originalEvent });
  }

  /**
   * Emit an `event-create` *request*. Per PRD scheduler-controlled-selection,
   * the scheduler does not mutate its internal events list — the consumer
   * receives the range and decides whether to construct an event from it.
   */
  emitEventCreate(
    range: TimeRange,
    view: ViewType,
    originalEvent: Event,
    resourceId?: string,
  ): void {
    this.emit({ type: 'event-create', range, view, resourceId, originalEvent });
  }

  /**
   * Emit an event-update event.
   */
  emitEventUpdate(
    event: EventDetail<'event-update'>['event'],
    oldEvent: EventDetail<'event-update'>['oldEvent'],
    originalEvent: Event
  ): void {
    this.emit({ type: 'event-update', event, oldEvent, originalEvent });
  }

  /**
   * Emit an event-delete event.
   */
  emitEventDelete(event: EventDetail<'event-delete'>['event']): void {
    this.emit({ type: 'event-delete', event });
  }

  /**
   * Emit a date-click event.
   */
  emitDateClick(date: Date, originalEvent: Event): void {
    this.emit({ type: 'date-click', date, originalEvent });
  }

  /**
   * Emit a view-change event.
   */
  emitViewChange(
    view: EventDetail<'view-change'>['view'],
    date: EventDetail<'view-change'>['date']
  ): void {
    this.emit({ type: 'view-change', view, date });
  }

  /**
   * Emit a selection-change event. Carries both the single-event focus and
   * the time-range selection — either may be null. Fires on every transition
   * so consumers can react to the selection clearing without polling.
   */
  emitSelectionChange(
    selectedEvent: EventDetail<'selection-change'>['selectedEvent'],
    range: TimeRange | null,
    view: ViewType,
    resourceId?: string,
  ): void {
    this.emit({ type: 'selection-change', selectedEvent, range, view, resourceId });
  }

  /**
   * Emit a `resource-create` or `group-create` *request*. Same controlled
   * contract as `event-create`: the scheduler never edits its own `resources`
   * input, so the consumer decides the id, title and placement. `parentId` is
   * the group to insert into — absent means root level.
   */
  emitResourceCreate(
    kind: 'resource' | 'group',
    view: ViewType,
    originalEvent: Event,
    parentId?: string,
  ): void {
    this.emit({
      type: kind === 'group' ? 'group-create' : 'resource-create',
      parentId,
      view,
      originalEvent,
    });
  }

  /**
   * Emit a `resource-update` request carrying only the changed fields, so the
   * consumer can apply them without diffing.
   */
  emitResourceUpdate(
    resource: Resource | ResourceGroup,
    changes: EventDetail<'resource-update'>['changes'],
    originalEvent: Event,
  ): void {
    this.emit({ type: 'resource-update', resource, changes, originalEvent });
  }

  /**
   * Emit a `resource-delete` request.
   */
  emitResourceDelete(resource: Resource | ResourceGroup, originalEvent: Event): void {
    this.emit({ type: 'resource-delete', resource, originalEvent });
  }
}
