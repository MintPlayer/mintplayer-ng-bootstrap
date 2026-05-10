import { SchedulerEvent, ViewType } from '@mintplayer/ng-bootstrap/web-components/scheduler-core';

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
      type: 'event-create';
      event: SchedulerEvent;
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
      type: 'selection-change';
      selectedEvent: SchedulerEvent | null;
    };

/**
 * Type helper to extract the detail type for a specific event.
 */
export type EventDetail<T extends SchedulerCustomEvent['type']> = Omit<
  Extract<SchedulerCustomEvent, { type: T }>,
  'type'
>;
