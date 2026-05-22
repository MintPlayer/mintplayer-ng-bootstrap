import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardElement } from '@mintplayer/web-components/card';

/**
 * React wrapper for `<mp-card>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCardElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCard = createComponent({
  react: React,
  tagName: 'mp-card',
  elementClass: MpCardElement,
});
