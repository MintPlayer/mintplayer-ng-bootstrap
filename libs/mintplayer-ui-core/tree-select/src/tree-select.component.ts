import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The tree-select's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-tree-select` (Angular), `BsTreeSelect` (React, Vue) and
 * `mp-tree-select` (Lit) from it, the core in `tree-select.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'tree-select',
  styles: [
    { scope: 'TREEVIEW_SCOPE', sheet: 'treeviewScopedStyles', from: '@mintplayer/ui-core/treeview' },
    { scope: 'TREE_SELECT_SCOPE', sheet: 'treeSelectScopedStyles' },
  ],
  components: {
    'tree-select': {
      core: 'treeSelectCore',
      doc: [
        'A hierarchical, async, searchable select (#437): a combobox, or a button, opening a tree in',
        'a native popover.',
        '',
        'Data comes from a `provider` (roots, search and lazy children, each paged); `value` holds',
        'whole nodes, one in `single` mode and an array in `multiple` / `checkbox`. `cascadeSelect`',
        'checks a branch with its loaded children. Slots: `item` (a chosen node), `suggestion` (a',
        "tree row's body), `button` (the button variant's body), `header`, `footer`, `noResults`,",
        '`enterSearchTerm`. An `aria-label` names the combobox.',
      ].join('\n'),
      inputs: {
        type: 'TreeSelectInputs',
        fields: {
          provider: { default: 'null', kind: false },
          value: { default: 'null', kind: false, model: true },
          mode: { default: "'single'", kind: 'string', reflect: true },
          variant: { default: "'textbox'", kind: 'string', reflect: true },
          cascadeSelect: { default: 'false', kind: 'boolean' },
          placeholder: { default: "''", kind: 'string' },
          showClear: { default: 'false', kind: 'boolean' },
          panelScrollHeight: { default: "'300px'", kind: 'string' },
          disabled: { default: 'false', kind: 'boolean', reflect: true },
          searchDebounceMs: { default: '200', kind: 'number' },
          inputLabel: { default: 'null', kind: 'string' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        valueChange: { type: 'TreeSelectValue', doc: 'The value, after the user changed it.' },
        selectionChange: { type: 'TreeSelectChangeEventDetail', doc: 'The node added or removed (neither for a clear), with the value.' },
        openChange: { type: 'boolean', doc: 'The panel opened (true) or closed (false).' },
        search: { type: 'TreeSelectSearchEventDetail', doc: 'A search started (an empty query restores the browse tree).' },
        loadError: { type: 'TreeSelectLoadErrorEventDetail', doc: 'A provider call rejected.' },
      },
      methods: {
        type: 'TreeSelectMethods',
        fields: {
          open: { doc: 'Open the panel (ignored when disabled or without a provider).' },
          close: { doc: 'Close the panel.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
