import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpTimepickerElement } from '@mintplayer/web-components/timepicker';
/**
 * React wrapper for `<mp-timepicker>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpTimepickerElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsTimepicker = createComponent({
  react: React,
  tagName: 'mp-timepicker',
  elementClass: MpTimepickerElement,
});
