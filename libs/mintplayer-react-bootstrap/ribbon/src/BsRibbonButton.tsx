import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonButton } from '@mintplayer/web-components/ribbon';
/**
 * React wrapper for `<mp-ribbon-button>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonButton;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-button',
  elementClass: MpRibbonButton,
});
