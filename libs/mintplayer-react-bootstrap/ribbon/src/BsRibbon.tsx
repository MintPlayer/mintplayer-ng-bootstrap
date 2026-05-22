import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbon } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-ribbon>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbon;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbon = createComponent({
  react: React,
  tagName: 'mp-ribbon',
  elementClass: MpRibbon,
});
