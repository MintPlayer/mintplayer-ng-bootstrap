import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCalendarElement } from '@mintplayer/web-components/calendar';

/**
 * React wrapper for `<mp-calendar>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCalendarElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCalendar = createComponent({
  react: React,
  tagName: 'mp-calendar',
  elementClass: MpCalendarElement,
});
