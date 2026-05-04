import { SchedulerCustomEvent, EventDetail } from './event-types';

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
   * Emit an event-click event.
   */
  emitEventClick(
    event: EventDetail<'event-click'>['event'],
    originalEvent: Event
  ): void {
    this.emit({ type: 'event-click', event, originalEvent });
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
   * Emit an event-create event.
   */
  emitEventCreate(
    event: EventDetail<'event-create'>['event'],
    originalEvent: Event
  ): void {
    this.emit({ type: 'event-create', event, originalEvent });
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
   * Emit a selection-change event.
   */
  emitSelectionChange(
    selectedEvent: EventDetail<'selection-change'>['selectedEvent']
  ): void {
    this.emit({ type: 'selection-change', selectedEvent });
  }
}
