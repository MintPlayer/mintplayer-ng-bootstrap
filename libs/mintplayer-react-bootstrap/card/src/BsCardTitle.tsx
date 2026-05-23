import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardTitleElement } from '@mintplayer/web-components/card';
/**
 * React wrapper for `<mp-card-title>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCardTitleElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCardTitle = createComponent({
  react: React,
  tagName: 'mp-card-title',
  elementClass: MpCardTitleElement,
});
