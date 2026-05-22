import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonMenuSeparator } from '@mintplayer/web-components/ribbon';
/**
 * React wrapper for `<mp-ribbon-menu-separator>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonMenuSeparator;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonMenuSeparator = createComponent({
  react: React,
  tagName: 'mp-ribbon-menu-separator',
  elementClass: MpRibbonMenuSeparator,
});
