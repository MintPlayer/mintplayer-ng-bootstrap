import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpDatetimePickerElement } from '@mintplayer/web-components/datetime-picker';
/**
 * React wrapper for `<mp-datetime-picker>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpDatetimePickerElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsDatetimePicker = createComponent({
  react: React,
  tagName: 'mp-datetime-picker',
  elementClass: MpDatetimePickerElement,
});
