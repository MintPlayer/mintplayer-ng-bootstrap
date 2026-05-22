import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonDropdownButton } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-ribbon-dropdown-button>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonDropdownButton;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonDropdownButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-dropdown-button',
  elementClass: MpRibbonDropdownButton,
});
