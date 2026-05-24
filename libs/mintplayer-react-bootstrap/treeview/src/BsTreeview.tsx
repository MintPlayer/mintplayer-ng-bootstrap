import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpTreeview,
  type TreeNodeSelectEventDetail,
  type TreeNodeExpandEventDetail,
  type TreeNodeCollapseEventDetail,
} from '@mintplayer/web-components/treeview';

/**
 * React wrapper for `<mp-treeview>`. Side-effect-registers the WC.
 *
 * `items` is a JS-shaped array of `TreeNode`s — @lit/react forwards it
 * as a property. `iconResolver` and `nodeRenderer` are functions and
 * likewise flow through as properties.
 */
export const BsTreeview = createComponent({
  react: React,
  tagName: 'mp-treeview',
  elementClass: MpTreeview,
  events: {
    onTreeNodeSelect: 'tree-node-select' as EventName<CustomEvent<TreeNodeSelectEventDetail>>,
    onTreeNodeExpand: 'tree-node-expand' as EventName<CustomEvent<TreeNodeExpandEventDetail>>,
    onTreeNodeCollapse: 'tree-node-collapse' as EventName<CustomEvent<TreeNodeCollapseEventDetail>>,
  },
});
