import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpScheduler } from '@mintplayer/web-components/scheduler';
import type {
  SchedulerEvent,
  TimeSlot,
  ViewType,
} from '@mintplayer/web-components/scheduler-core';

interface TimeRange { start: Date; end: Date; }

/**
 * React wrapper for `<mp-scheduler>`. Side-effect-registers the WC via
 * the import above. Maps every scheduler custom-event onto a typed
 * `on*` React prop.
 *
 * Note: `events` and `resources` props are JS-shaped (arrays of
 * SchedulerEvent / Resource); @lit/react forwards them as element
 * properties.
 */
export const BsScheduler = createComponent({
  react: React,
  tagName: 'mp-scheduler',
  elementClass: MpScheduler,
  events: {
    onEventSelected: 'event-selected' as EventName<CustomEvent<{ event: SchedulerEvent; originalEvent: Event }>>,
    onEventDblClick: 'event-dblclick' as EventName<CustomEvent<{ event: SchedulerEvent; originalEvent: Event }>>,
    onEventCreate: 'event-create' as EventName<CustomEvent<{ range: TimeRange; view: ViewType; resourceId?: string; originalEvent: Event }>>,
    onEventUpdate: 'event-update' as EventName<CustomEvent<{ event: SchedulerEvent; oldEvent: SchedulerEvent; originalEvent: Event }>>,
    onEventDelete: 'event-delete' as EventName<CustomEvent<{ event: SchedulerEvent; originalEvent: Event }>>,
    onDateClick: 'date-click' as EventName<CustomEvent<{ date: Date; originalEvent: Event }>>,
    // Fires for view switches AND internal date navigation (prev/next/today)
    // — `date` carries the newly displayed date, so a controlled `date` prop
    // stays in sync by updating state from this callback.
    onViewChange: 'view-change' as EventName<CustomEvent<{ view: ViewType; date: Date }>>,
    onSelectionChange: 'selection-change' as EventName<CustomEvent<{ range: TimeRange | null; view: ViewType; slots?: TimeSlot[] }>>,
  },
});
