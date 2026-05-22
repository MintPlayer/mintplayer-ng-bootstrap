import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCheckbox } from '@mintplayer/web-components/checkbox';

/**
 * React wrapper for `<mp-checkbox>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCheckbox;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCheckbox = createComponent({
  react: React,
  tagName: 'mp-checkbox',
  elementClass: MpCheckbox,
});
