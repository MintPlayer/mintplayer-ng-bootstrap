import * as React from 'react';
import { createComponent } from '@lit/react';
import { MintMultiRangeElement } from '@mintplayer/web-components/multi-range';

/**
 * React wrapper for `<mp-multi-range>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MintMultiRangeElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsMultiRange = createComponent({
  react: React,
  tagName: 'mp-multi-range',
  elementClass: MintMultiRangeElement,
});
