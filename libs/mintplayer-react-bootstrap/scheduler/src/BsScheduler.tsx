import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpScheduler } from '@mintplayer/web-components/scheduler';
import type { SchedulerEventMap } from '@mintplayer/web-components/scheduler-core';

/**
 * React wrapper for `<mp-scheduler>`. Side-effect-registers the WC via
 * the import above. Maps every scheduler custom-event onto a typed
 * `on*` React prop.
 *
 * The payload types come straight from `SchedulerEventMap`, the web
 * component's own union — hand-copied shapes had drifted (an invented `slots`
 * field on selection-change, a required `originalEvent` on event-delete that
 * is never sent, a missing `selectedEvent`), and a wrong type here is worse
 * than none because it type-checks.
 *
 * Note: `events` and `resources` props are JS-shaped (arrays of
 * SchedulerEvent / Resource); @lit/react forwards them as element
 * properties. `readonly` is a real property on the element, so it forwards
 * the same way.
 */
export const BsScheduler = createComponent({
  react: React,
  tagName: 'mp-scheduler',
  elementClass: MpScheduler,
  events: {
    onEventSelected: 'event-selected' as EventName<SchedulerEventMap['event-selected']>,
    onEventDblClick: 'event-dblclick' as EventName<SchedulerEventMap['event-dblclick']>,
    onEventCreate: 'event-create' as EventName<SchedulerEventMap['event-create']>,
    onEventUpdate: 'event-update' as EventName<SchedulerEventMap['event-update']>,
    onEventDelete: 'event-delete' as EventName<SchedulerEventMap['event-delete']>,
    onDateClick: 'date-click' as EventName<SchedulerEventMap['date-click']>,
    // Fires for view switches AND internal date navigation (prev/next/today)
    // — `date` carries the newly displayed date, so a controlled `date` prop
    // stays in sync by updating state from this callback.
    onViewChange: 'view-change' as EventName<SchedulerEventMap['view-change']>,
    onSelectionChange: 'selection-change' as EventName<SchedulerEventMap['selection-change']>,
    // Resource-tree mutation requests (timeline view, off unless the matching
    // permission is granted). Like event-create these are requests: apply them
    // to your own `resources` array.
    onResourceCreate: 'resource-create' as EventName<SchedulerEventMap['resource-create']>,
    onGroupCreate: 'group-create' as EventName<SchedulerEventMap['group-create']>,
    onResourceUpdate: 'resource-update' as EventName<SchedulerEventMap['resource-update']>,
    onResourceDelete: 'resource-delete' as EventName<SchedulerEventMap['resource-delete']>,
  },
});
