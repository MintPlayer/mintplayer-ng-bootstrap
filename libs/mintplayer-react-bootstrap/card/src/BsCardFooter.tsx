import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardFooterElement } from '@mintplayer/web-components/card';

/**
 * React wrapper for `<mp-card-footer>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCardFooterElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCardFooter = createComponent({
  react: React,
  tagName: 'mp-card-footer',
  elementClass: MpCardFooterElement,
});
