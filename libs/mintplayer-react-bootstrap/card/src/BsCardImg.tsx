import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardImgElement } from '@mintplayer/web-components/card';

/**
 * React wrapper for `<mp-card-img>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCardImgElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCardImg = createComponent({
  react: React,
  tagName: 'mp-card-img',
  elementClass: MpCardImgElement,
});
