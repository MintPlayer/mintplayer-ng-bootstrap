import { SchedulerEvent, ViewType } from '@mintplayer/web-components/scheduler-core';
/**
 * Time range carried by selection-change and event-create. `start` is the
 * inclusive lower edge, `end` is the exclusive upper edge of the last
 * selected slot — matching the natural slot-pair shape produced by
 * `selectionRange()` in `views/base-view.ts`.
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * All custom events the scheduler can emit.
 * Using a discriminated union for type safety.
 */
export type SchedulerCustomEvent =
  | {
      // Renamed from `event-click`: keyboard Tab on an event also fires this
      // (see PRD scheduler-keyboard-grid-nav §6.5 D3), so "click" no longer
      // describes the trigger. Breaking change; no shim per BC-not-default.
      type: 'event-selected';
      event: SchedulerEvent;
      originalEvent: Event;
    }
  | {
      type: 'event-dblclick';
      event: SchedulerEvent;
      originalEvent: Event;
    }
  | {
      // Per PRD scheduler-controlled-selection: this is now a *request*. The
      // scheduler does NOT mutate its internal events list; the consumer
      // constructs the actual SchedulerEvent (with its own id, title, colour)
      // and decides whether/how to add it.
      type: 'event-create';
      range: TimeRange;
      view: ViewType;
      resourceId?: string;
      originalEvent: Event;
    }
  | {
      type: 'event-update';
      event: SchedulerEvent;
      oldEvent: SchedulerEvent;
      originalEvent: Event;
    }
  | {
      type: 'event-delete';
      event: SchedulerEvent;
    }
  | {
      type: 'date-click';
      date: Date;
      originalEvent: Event;
    }
  | {
      type: 'view-change';
      view: ViewType;
      date: Date;
    }
  | {
      // Fires on every selection transition — including the transition to
      // an empty selection (range: null), so consumers can clear derived UI
      // without polling. `selectedEvent` carries the single-event focus,
      // `range` carries the time-range selection; the two are independent.
      type: 'selection-change';
      selectedEvent: SchedulerEvent | null;
      range: TimeRange | null;
      view: ViewType;
      resourceId?: string;
    };

/**
 * Type helper to extract the detail type for a specific event.
 */
export type EventDetail<T extends SchedulerCustomEvent['type']> = Omit<
  Extract<SchedulerCustomEvent, { type: T }>,
  'type'
>;
