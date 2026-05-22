import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonGallery } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-ribbon-gallery>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonGallery;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonGallery = createComponent({
  react: React,
  tagName: 'mp-ribbon-gallery',
  elementClass: MpRibbonGallery,
});
