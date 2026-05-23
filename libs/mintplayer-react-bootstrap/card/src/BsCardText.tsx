import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardTextElement } from '@mintplayer/web-components/card';
/**
 * React wrapper for `<mp-card-text>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCardTextElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCardText = createComponent({
  react: React,
  tagName: 'mp-card-text',
  elementClass: MpCardTextElement,
});
