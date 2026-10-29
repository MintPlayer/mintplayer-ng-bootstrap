import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The datatable's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-datatable` (Angular), `BsDatatable` (React, Vue) and
 * `mp-datatable` (Lit) from it, the core in `datatable.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'datatable',
  style: { scope: 'datatable' },
  components: {
    datatable: {
      core: 'datatableCore',
      doc: [
        'A sortable, pageable, selectable table (#437), over local `data` or a server `fetch`;',
        'virtual scrolling, a lazy tree (`tree` + `idKey` + `childCountKey`) and resizable columns.',
        '',
        'Columns are data (`DatatableColumnDef`). Slots: `header {column}` (a header label),',
        '`cell {row, column, rowIndex}` (one cell) and `row {row, rowIndex, ctx}` (all of a',
        "row's data cells) and `filter {column, ctx}` (the panel of a column with `filterMode: 'custom'`). Two-way: `sortColumns`, `page`, `perPage`, `selectedIds`, `expandedIds`.",
        'An `aria-label` names the table.',
      ].join('\n'),
      inputs: {
        type: 'DatatableInputs',
        fields: {
          columns: { default: '[]', kind: false },
          data: { default: '[]', kind: false },
          fetch: { default: 'null', kind: false },
          caption: { default: 'null', kind: 'string' },
          labels: { default: 'null', kind: false },
          inputLabel: { default: 'null', kind: 'string' },
          sortColumns: { default: '[]', kind: false, model: true },
          page: { default: '1', kind: 'number', model: true },
          perPage: { default: '20', kind: 'number', model: true },
          perPageOptions: { default: '[10, 20, 50]', kind: false },
          pagination: { default: 'false', kind: 'boolean' },
          autoSort: { default: 'true', kind: 'boolean' },
          selectionMode: { default: "'none'", kind: 'string', reflect: true },
          selectedIds: { default: '[]', kind: false, model: true },
          cutIds: { default: '[]', kind: false },
          focusedRowKey: { default: 'null', kind: 'string' },
          rowLabel: { default: 'null', kind: false },
          rowKey: { default: 'null', kind: false },
          tree: { default: 'false', kind: 'boolean' },
          idKey: { default: 'null', kind: false },
          childCountKey: { default: 'null', kind: 'string' },
          treeIndent: { default: '1.25', kind: 'number' },
          expandedIds: { default: '[]', kind: false, model: true },
          selectionStrategy: { default: "'flat'", kind: 'string' },
          loading: { default: 'false', kind: 'boolean' },
          emptyMessage: { default: "'No data'", kind: 'string' },
          virtualScroll: { default: 'false', kind: 'boolean' },
          itemSize: { default: '40', kind: 'number' },
          virtualBuffer: { default: '10', kind: 'number' },
          fill: { default: 'false', kind: 'boolean', reflect: true },
          resizableColumns: { default: 'true', kind: 'boolean' },
          hrefFor: { default: 'null', kind: false },
          distincts: { default: 'null', kind: false },
        },
      },
      outputs: {
        sortColumnsChange: { type: 'SortColumn[]', doc: 'The sort, after the user changed it.' },
        pageChange: { type: 'number', doc: 'The page, after the user changed it.' },
        perPageChange: { type: 'number', doc: 'The page size, after the user changed it.' },
        selectedIdsChange: { type: 'string[]', doc: 'The selected row keys, after the user changed them.' },
        expandedIdsChange: { type: 'unknown[]', doc: 'The expanded row ids, after the user changed them.' },
        rowClick: { type: 'RowEventDetail', doc: 'A row was clicked, or opened with Enter.' },
        rowDblClick: { type: 'RowEventDetail', doc: 'A row was double-clicked.' },
        rowContextMenu: { type: 'RowEventDetail', doc: "A row's context menu; `originalEvent.preventDefault()` suppresses the browser's." },
        selectionChanged: { type: 'SelectionChangeEventDetail', doc: 'The user changed the selection: the keys and their rows.' },
        rowExpand: { type: 'TreeRowExpandDetail', doc: 'A tree row expanded.' },
        rowCollapse: { type: 'TreeRowExpandDetail', doc: 'A tree row collapsed.' },
        loadError: { type: 'DatatableLoadErrorDetail', doc: 'A `fetch` call rejected.' },
        filterChange: { type: 'FilterChangeDetail', doc: "A column's filter changed; the consumer decides which rows it removes." },
      },
      methods: {
        type: 'DatatableMethods',
        fields: {
          reload: { doc: 'Re-query `fetch` for the current sort, page and page size; `{ resetPage: true }` also returns to page 1.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
