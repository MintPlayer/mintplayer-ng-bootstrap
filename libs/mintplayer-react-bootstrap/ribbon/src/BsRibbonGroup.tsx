import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonGroup } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-ribbon-group>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonGroup;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonGroup = createComponent({
  react: React,
  tagName: 'mp-ribbon-group',
  elementClass: MpRibbonGroup,
});
