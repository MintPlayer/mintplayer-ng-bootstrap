import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardHeaderElement } from '@mintplayer/web-components/card';
/**
 * React wrapper for `<mp-card-header>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCardHeaderElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCardHeader = createComponent({
  react: React,
  tagName: 'mp-card-header',
  elementClass: MpCardHeaderElement,
});
