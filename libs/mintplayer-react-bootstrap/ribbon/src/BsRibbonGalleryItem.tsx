import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonGalleryItem } from '@mintplayer/web-components/ribbon';
/**
 * React wrapper for `<mp-ribbon-gallery-item>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonGalleryItem;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonGalleryItem = createComponent({
  react: React,
  tagName: 'mp-ribbon-gallery-item',
  elementClass: MpRibbonGalleryItem,
});
