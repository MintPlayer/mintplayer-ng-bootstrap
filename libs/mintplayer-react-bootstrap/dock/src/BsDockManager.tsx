import * as React from 'react';
import { createComponent } from '@lit/react';
import { MintDockManagerElement } from '@mintplayer/web-components/dock';
/**
 * React wrapper for `<mint-dock-manager>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MintDockManagerElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsDockManager = createComponent({
  react: React,
  tagName: 'mint-dock-manager',
  elementClass: MintDockManagerElement,
});
