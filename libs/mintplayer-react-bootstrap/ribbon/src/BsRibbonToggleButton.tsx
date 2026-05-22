import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonToggleButton } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-ribbon-toggle-button>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonToggleButton;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonToggleButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-toggle-button',
  elementClass: MpRibbonToggleButton,
});
