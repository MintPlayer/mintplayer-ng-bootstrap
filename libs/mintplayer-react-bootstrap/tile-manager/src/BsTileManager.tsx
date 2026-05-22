import * as React from 'react';
import { createComponent } from '@lit/react';
import { MintTileManagerElement } from '@mintplayer/web-components/tile-manager';

/**
 * React wrapper for `<mp-tile-manager>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MintTileManagerElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsTileManager = createComponent({
  react: React,
  tagName: 'mp-tile-manager',
  elementClass: MintTileManagerElement,
});
