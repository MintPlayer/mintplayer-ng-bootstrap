import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonMenuItem } from '@mintplayer/web-components/ribbon';
/**
 * React wrapper for `<mp-ribbon-menu-item>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonMenuItem;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonMenuItem = createComponent({
  react: React,
  tagName: 'mp-ribbon-menu-item',
  elementClass: MpRibbonMenuItem,
});
