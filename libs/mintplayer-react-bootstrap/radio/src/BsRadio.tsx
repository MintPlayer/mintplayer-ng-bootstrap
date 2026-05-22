import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRadio } from '@mintplayer/web-components/radio';

/**
 * React wrapper for `<mp-radio>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRadio;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRadio = createComponent({
  react: React,
  tagName: 'mp-radio',
  elementClass: MpRadio,
});
