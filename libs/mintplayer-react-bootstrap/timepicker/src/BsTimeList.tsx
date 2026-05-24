import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpTimeListElement } from '@mintplayer/web-components/timepicker';

/**
 * React wrapper for `<mp-time-list>`. Side-effect-registers the WC via
 * the import above. Typed props extend off MpTimeListElement; the
 * `events` map surfaces the WC's `selected-time-change` CustomEvent as
 * an idiomatic React `onSelectedTimeChange` prop.
 */
export const BsTimeList = createComponent({
  react: React,
  tagName: 'mp-time-list',
  elementClass: MpTimeListElement,
  events: {
    onSelectedTimeChange: 'selected-time-change' as EventName<CustomEvent<Date>>,
  },
});
