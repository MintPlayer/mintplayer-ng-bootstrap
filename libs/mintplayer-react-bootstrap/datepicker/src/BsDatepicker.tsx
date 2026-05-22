import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpDatepickerElement } from '@mintplayer/web-components/datepicker';

/**
 * React wrapper for `<mp-datepicker>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpDatepickerElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsDatepicker = createComponent({
  react: React,
  tagName: 'mp-datepicker',
  elementClass: MpDatepickerElement,
});
