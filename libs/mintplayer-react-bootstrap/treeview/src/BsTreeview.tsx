import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpTreeview } from '@mintplayer/web-components/treeview';

/**
 * React wrapper for `<mp-treeview>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpTreeview;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsTreeview = createComponent({
  react: React,
  tagName: 'mp-treeview',
  elementClass: MpTreeview,
});
