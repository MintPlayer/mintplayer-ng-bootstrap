import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonTab } from '@mintplayer/web-components/ribbon';
/**
 * React wrapper for `<mp-ribbon-tab>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonTab;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonTab = createComponent({
  react: React,
  tagName: 'mp-ribbon-tab',
  elementClass: MpRibbonTab,
});
