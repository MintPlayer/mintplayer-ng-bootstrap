import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonSplitButton } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-ribbon-split-button>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonSplitButton;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonSplitButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-split-button',
  elementClass: MpRibbonSplitButton,
});
