import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpTimepickerElement } from '@mintplayer/web-components/timepicker';

/**
 * React wrapper for `<mp-timepicker>`. Side-effect-registers the WC via
 * the import above. Typed props extend off MpTimepickerElement; the
 * `events` map surfaces the WC's `selected-time-change` CustomEvent as
 * an idiomatic React `onSelectedTimeChange` prop.
 */
export const BsTimepicker = createComponent({
  react: React,
  tagName: 'mp-timepicker',
  elementClass: MpTimepickerElement,
  events: {
    onSelectedTimeChange: 'selected-time-change' as EventName<CustomEvent<Date>>,
  },
});
