import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The hierarchy chart's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-hierarchy-chart` (Angular), `BsHierarchyChart` (React, Vue) and
 * `mp-hierarchy-chart` (Lit) from it, the core in `hierarchy.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'charts/hierarchy',
  style: { scope: 'hierarchy-chart' },
  components: {
    'hierarchy-chart': {
      core: 'hierarchyChartCore',
      doc: [
        'One weighted tree, three projections: `layout` is sunburst, icicle or treemap.',
        '',
        'Size follows the summed leaf `value`, colour follows `colorValue`. Click, Enter or a breadcrumb re-roots',
        'on a node (two-way `rootId`); ctrl/cmd+wheel, pinch and `+` / `-` / `0` magnify it geometrically.',
        'Every node is a treeitem: arrows move between siblings (Down goes outward), Escape and Backspace zoom out.',
        'The server renders the finished chart at a 420px fallback scale, its controls inert until it is live.',
      ].join('\n'),
      inputs: {
        type: 'HierarchyChartInputs',
        fields: {
          data: { default: 'null', kind: false },
          layout: { default: "'sunburst'", kind: 'string' },
          rootId: { default: 'null', kind: 'string', model: true },
          maxDepth: { default: 'null', kind: 'string', doc: 'A positive number, or `auto`.' },
          minAngle: { default: '0.2', kind: 'number' },
          minSize: { default: '4', kind: 'number' },
          showLabels: { default: 'true', kind: 'boolean' },
          labelFontSize: { default: '12', kind: 'number' },
          backdrop: { default: 'null', kind: 'string' },
          colorMin: { default: '0', kind: 'number' },
          colorMax: { default: '100', kind: 'number' },
          colorStart: { default: "'#fe0000'", kind: 'string' },
          colorEnd: { default: "'#21b577'", kind: 'string' },
          transitionDuration: { default: '300', kind: 'number' },
          locale: { default: 'null', kind: 'string' },
          zoomGestures: { default: "'wheel pinch'", kind: 'string' },
          zoomHintLabel: { default: 'null', kind: 'string' },
          showBreadcrumb: { default: 'false', kind: 'boolean' },
          breadcrumbLabel: { default: "'Chart path'", kind: 'string' },
          zoomOutLabel: { default: "'Zoom out one level'", kind: 'string' },
          metricUnitLabel: { default: "'%'", kind: 'string' },
          valueUnitLabel: { default: "''", kind: 'string' },
          loadingLabel: { default: "'Loading'", kind: 'string' },
          inputLabel: { default: 'null', kind: 'string' },
          tooltipFormatter: { default: 'null', kind: false },
          labelFormatter: { default: 'null', kind: false },
          loadChildren: { default: 'null', kind: false },
        },
      },
      outputs: {
        rootIdChange: { type: 'string | null', doc: 'The focus node changed (null: the tree root).' },
        zoom: { type: 'HierarchyNodeEventDetail', doc: 'The chart re-rooted on a node; the detail has its path.' },
        nodeSelect: { type: 'HierarchyNodeEventDetail', doc: 'A leaf was clicked or activated with Enter.' },
        nodeHover: { type: 'HierarchyHoverEventDetail', doc: 'The hovered node changed (`node` null when the pointer leaves).' },
        nodeLoadError: { type: 'HierarchyLoadErrorEventDetail', doc: 'A lazy `loadChildren` call rejected; activating the node retries.' },
      },
      methods: {
        type: 'HierarchyChartMethods',
        fields: {
          zoomTo: { doc: 'Re-root on a node id (the tree root when omitted).' },
          focusNode: { doc: 'Move focus to a rendered node.' },
          setZoomLevel: { doc: 'Magnify geometrically, anchored at chart fractions (default: the centre).' },
          resetZoom: { doc: 'Back to the fitted view.' },
          zoomLevel: { doc: 'The current geometric magnification (1 = fitted).' },
        },
      },
    },
  },
} satisfies ComponentGroup;
