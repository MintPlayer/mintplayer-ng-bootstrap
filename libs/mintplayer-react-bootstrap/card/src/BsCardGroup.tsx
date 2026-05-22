import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardGroupElement } from '@mintplayer/web-components/card';

/**
 * React wrapper for `<mp-card-group>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCardGroupElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCardGroup = createComponent({
  react: React,
  tagName: 'mp-card-group',
  elementClass: MpCardGroupElement,
});
