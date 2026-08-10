import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpHierarchyChart,
  type HierarchyHoverEventDetail,
  type HierarchyLoadErrorEventDetail,
  type HierarchyNodeEventDetail,
} from '@mintplayer/web-components/charts/hierarchy';

/**
 * React wrapper for `<mp-hierarchy-chart>`. Side-effect-registers the WC.
 * `data`, `loadChildren` and the formatters are objects/functions —
 * @lit/react forwards them as element properties.
 */
export const BsHierarchyChart = createComponent({
  react: React,
  tagName: 'mp-hierarchy-chart',
  elementClass: MpHierarchyChart,
  events: {
    onHierarchyZoom: 'hierarchy-zoom' as EventName<CustomEvent<HierarchyNodeEventDetail>>,
    onHierarchyNodeSelect: 'hierarchy-node-select' as EventName<CustomEvent<HierarchyNodeEventDetail>>,
    onHierarchyNodeHover: 'hierarchy-node-hover' as EventName<CustomEvent<HierarchyHoverEventDetail>>,
    onHierarchyNodeLoadError: 'hierarchy-node-load-error' as EventName<CustomEvent<HierarchyLoadErrorEventDetail>>,
  },
});
