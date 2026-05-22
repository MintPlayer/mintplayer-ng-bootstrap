import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonGroupButton } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-ribbon-group-button>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonGroupButton;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonGroupButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-group-button',
  elementClass: MpRibbonGroupButton,
});
