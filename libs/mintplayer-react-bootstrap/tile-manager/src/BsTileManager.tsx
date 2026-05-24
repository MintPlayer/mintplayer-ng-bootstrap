import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MintTileManagerElement,
  type TileLayoutSnapshot,
  type TileGestureBlocked,
  type TilePosition,
} from '@mintplayer/web-components/tile-manager';

/**
 * React wrapper for `<mp-tile-manager>`. Side-effect-registers the WC.
 *
 * The WC takes a `.tiles` JS prop (array of `{id, position, disableMove?,
 * disableResize?, label?}`) and projects each tile's header + body into
 * `${id}-header` / `${id}-content` named slots. Consumers render slot
 * content as light-DOM children:
 *
 *   <BsTileManager tiles={[{id:'t1', position:{...}}]}>
 *     <div slot="t1-header">Title</div>
 *     <div slot="t1-content">Body</div>
 *   </BsTileManager>
 */
export const BsTileManager = createComponent({
  react: React,
  tagName: 'mp-tile-manager',
  elementClass: MintTileManagerElement,
  events: {
    onTilelayoutchange: 'tilelayoutchange' as EventName<CustomEvent<TileLayoutSnapshot>>,
    onTilepositionchange: 'tilepositionchange' as EventName<CustomEvent<{ id: string; position: TilePosition }>>,
    onTilegestureblocked: 'tilegestureblocked' as EventName<CustomEvent<TileGestureBlocked>>,
  },
});
