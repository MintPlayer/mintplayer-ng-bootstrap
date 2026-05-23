import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardSubtitleElement } from '@mintplayer/web-components/card';
/**
 * React wrapper for `<mp-card-subtitle>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCardSubtitleElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCardSubtitle = createComponent({
  react: React,
  tagName: 'mp-card-subtitle',
  elementClass: MpCardSubtitleElement,
});
