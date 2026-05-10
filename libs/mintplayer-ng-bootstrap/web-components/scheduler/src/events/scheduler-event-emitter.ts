import { SchedulerCustomEvent, EventDetail, TimeRange } from './event-types';
import { ViewType } from '@mintplayer/ng-bootstrap/web-components/scheduler-core';

/**
 * Handles dispatching custom events from the scheduler.
 * Centralizes event emission logic for consistency.
 */
export class SchedulerEventEmitter {
  constructor(private readonly host: HTMLElement) {}

  /**
   * Emit a scheduler custom event.
   * The event will bubble up through the DOM.
   */
  emit(event: SchedulerCustomEvent): void {
    const { type, ...detail } = event;
    this.host.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
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
}
