import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The treeview's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-treeview` (Angular), `BsTreeview` (React, Vue) and
 * `mp-treeview` (Lit) from it, the core in `treeview.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'treeview',
  styles: [{ scope: 'TREEVIEW_SCOPE', sheet: 'treeviewScopedStyles' }],
  components: {
    treeview: {
      core: 'treeviewCore',
      doc: [
        'A data-driven tree (WAI-ARIA tree pattern, #437).',
        '',
        'Give it `items`; `expandedIds` and `selectedIds` are two-way. The `node` slot renders a',
        "node's body (the chevron stays). Lazy nodes (`lazy: true`) load through `loadChildren` on",
        'first expansion. The server render shows every expanded level. An `aria-label` names it.',
      ].join('\n'),
      inputs: {
        type: 'TreeviewInputs',
        fields: {
          items: { default: '[]' },
          expandedIds: { default: '[]', model: true },
          selectedIds: { default: '[]', model: true },
          selectionMode: { default: "'single'", reflect: true },
          hideBorders: { default: 'false', reflect: true },
          iconResolver: {},
          loadChildren: {},
          inputLabel: { default: 'null', kind: 'string' },
          labels: {},
        },
      },
      outputs: {
        nodeSelect: { type: 'TreeNodeSelectEventDetail', doc: 'A node was selected or deselected.' },
        nodeExpand: { type: 'TreeNodeExpandEventDetail', doc: 'A node expanded (after its lazy load, if any).' },
        nodeCollapse: { type: 'TreeNodeCollapseEventDetail', doc: 'A node collapsed.' },
        nodeLoadError: { type: 'TreeNodeLoadErrorEventDetail', doc: "A lazy node's loader rejected." },
        selectedIdsChange: { type: 'TreeviewIds', doc: 'The ids of the selected nodes.' },
        expandedIdsChange: { type: 'TreeviewIds', doc: 'The ids of the expanded nodes.' },
      },
    },
  },
} satisfies ComponentGroup;
