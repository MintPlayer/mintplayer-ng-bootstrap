import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpDatetimePickerElement } from '@mintplayer/web-components/datetime-picker';

/**
 * React wrapper for `<mp-datetime-picker>`. Side-effect-registers the WC
 * via the import above. The `value` prop is a `Date | null` JS object
 * forwarded as a class property (attribute: false on the WC); the
 * `value-change` CustomEvent<Date | null> surfaces as React `onValueChange`.
 */
export const BsDatetimePicker = createComponent({
  react: React,
  tagName: 'mp-datetime-picker',
  elementClass: MpDatetimePickerElement,
  events: {
    onValueChange: 'value-change' as EventName<CustomEvent<Date | null>>,
    onOpened: 'opened' as EventName<CustomEvent<'date' | 'time'>>,
    onClosed: 'closed' as EventName<CustomEvent<'date' | 'time'>>,
  },
});
