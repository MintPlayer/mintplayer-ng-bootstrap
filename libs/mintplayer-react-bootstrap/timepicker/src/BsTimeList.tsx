import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpTimeListElement } from '@mintplayer/web-components/timepicker';
/**
 * React wrapper for `<mp-time-list>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpTimeListElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsTimeList = createComponent({
  react: React,
  tagName: 'mp-time-list',
  elementClass: MpTimeListElement,
});
