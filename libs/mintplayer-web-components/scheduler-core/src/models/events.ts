import { SchedulerEvent } from './event';
import { Resource, ResourceGroup } from './resource';
import { ViewType } from './types';

/**
 * Time range carried by `selection-change` and `event-create`. `start` is the
 * inclusive lower edge, `end` is the exclusive upper edge of the last selected
 * slot — matching the natural slot-pair shape produced by `selectionRange()`
 * in `views/base-view.ts`.
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Every custom event `mp-scheduler` can emit, as one discriminated union.
 *
 * This union is the SINGLE source of truth for the event surface: the emitter
 * accepts it, `EventDetail<T>` derives each payload from it, and
 * `SchedulerEventMap` is a mechanical mapping of it. A second hand-written
 * table drifts — the previous one had grown a `date-select` entry nothing
 * emitted and a `date-click` resource field nothing sent.
 *
 * Every event bubbles AND is composed, so a scheduler nested inside another
 * component's shadow root still reaches the outer consumer.
 */
export type SchedulerCustomEvent =
  | {
      // Renamed from `event-click`: keyboard Tab on an event also fires this
      // (see PRD scheduler-keyboard-grid-nav §6.5 D3), so "click" no longer
      // describes the trigger.
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
      // Per PRD scheduler-controlled-selection: this is a *request*. The
      // scheduler does NOT mutate its own events list; the consumer builds the
      // actual SchedulerEvent (id, title, colour) and decides whether to add it.
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
      // Fires on every selection transition — including the transition to an
      // empty selection (range: null), so consumers can clear derived UI
      // without polling. `selectedEvent` carries the single-event focus,
      // `range` the time-range selection; the two are independent.
      type: 'selection-change';
      selectedEvent: SchedulerEvent | null;
      range: TimeRange | null;
      view: ViewType;
      resourceId?: string;
    }
  | {
      // Resource/group mutation *requests*, same controlled contract as
      // `event-create`: the scheduler never edits its own `resources` input.
      // `parentId` is the group to insert into, absent for a root-level item.
      type: 'resource-create';
      parentId?: string;
      view: ViewType;
      originalEvent: Event;
    }
  | {
      type: 'group-create';
      parentId?: string;
      view: ViewType;
      originalEvent: Event;
    }
  | {
      // `changes` carries only the fields the scheduler is asking to change
      // (today: `title` on rename, `color` on recolour), so a consumer can
      // apply them without diffing.
      type: 'resource-update';
      resource: Resource | ResourceGroup;
      changes: Partial<Resource & ResourceGroup>;
      originalEvent: Event;
    }
  | {
      type: 'resource-delete';
      resource: Resource | ResourceGroup;
      originalEvent: Event;
    };

/**
 * Payload of one scheduler event — the union arm minus its discriminant.
 */
export type EventDetail<T extends SchedulerCustomEvent['type']> = Omit<
  Extract<SchedulerCustomEvent, { type: T }>,
  'type'
>;

/**
 * `HTMLElementEventMap`-shaped view of the union, for `addEventListener`
 * typing in consumer code.
 */
export type SchedulerEventMap = {
  [T in SchedulerCustomEvent['type']]: CustomEvent<EventDetail<T>>;
};
