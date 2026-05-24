import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MintDockManagerElement,
  type DockLayoutSnapshot,
} from '@mintplayer/web-components/dock';

/**
 * React wrapper for `<mint-dock-manager>`. Side-effect-registers the WC
 * via the import above. The `layout` JS prop is an object, so @lit/react
 * forwards it as a property — pass a snapshot directly, no JSON
 * stringification needed.
 *
 * Project pane content via native named slots:
 *   <BsDockManager layout={layout}>
 *     <div slot="panel-1">…</div>
 *     <div slot="panel-2">…</div>
 *   </BsDockManager>
 */
export const BsDockManager = createComponent({
  react: React,
  tagName: 'mint-dock-manager',
  elementClass: MintDockManagerElement,
  events: {
    onLayoutChanged: 'dock-layout-changed' as EventName<CustomEvent<DockLayoutSnapshot>>,
  },
});
