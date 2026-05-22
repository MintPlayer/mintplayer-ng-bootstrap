import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonTemplateItem } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-ribbon-template-item>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonTemplateItem;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonTemplateItem = createComponent({
  react: React,
  tagName: 'mp-ribbon-template-item',
  elementClass: MpRibbonTemplateItem,
});
