import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardBodyElement } from '@mintplayer/web-components/card';

/**
 * React wrapper for `<mp-card-body>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCardBodyElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCardBody = createComponent({
  react: React,
  tagName: 'mp-card-body',
  elementClass: MpCardBodyElement,
});
