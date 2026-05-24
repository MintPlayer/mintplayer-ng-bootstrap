import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpDatepickerElement } from '@mintplayer/web-components/datepicker';

/**
 * React wrapper for `<mp-datepicker>`. Side-effect-registers the WC via the
 * import above. Surfaces the WC's `selected-date-change` /
 * `current-month-change` / `opened` / `closed` events as React props.
 *
 * `selectedDate` / `currentMonth` / `disableDateFn` / `min` / `max` are
 * `attribute: false` class fields on the WC — pass them as JS objects (Date
 * instances, functions) and @lit/react forwards them as properties.
 */
export const BsDatepicker = createComponent({
  react: React,
  tagName: 'mp-datepicker',
  elementClass: MpDatepickerElement,
  events: {
    onSelectedDateChange: 'selected-date-change' as EventName<CustomEvent<Date>>,
    onCurrentMonthChange: 'current-month-change' as EventName<CustomEvent<Date>>,
    onOpened: 'opened' as EventName<CustomEvent<void>>,
    onClosed: 'closed' as EventName<CustomEvent<void>>,
  },
});
