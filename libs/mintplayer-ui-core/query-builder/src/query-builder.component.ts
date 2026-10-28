import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The query builder's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-query-builder` (Angular), `BsQueryBuilder` (React, Vue) and
 * `mp-query-builder` (Lit) from it, the core in `query-builder.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'query-builder',
  styles: [{ scope: 'QUERY_BUILDER_SCOPE', sheet: 'queryBuilderScopedStyles' }],
  components: {
    'query-builder': {
      core: 'queryBuilderCore',
      doc: [
        'A visual editor for a filter expression: AND/OR groups, conditions and sub-queries over a relation (#437).',
        '',
        '`query` is two-way. The tree renders as flat rows, so the server render shows the whole query.',
        "A field with `editor: 'custom'` renders its value through the `editor` slot, which receives an",
        '`EditorContext` (call `ctx.onChange(next)`). Rows reorder by dragging the handle, or with',
        'Alt+Up/Down on a row. An `aria-label` names it.',
      ].join('\n'),
      inputs: {
        type: 'QueryBuilderInputs',
        fields: {
          query: { default: 'null', model: true },
          schema: { default: '[]' },
          rootEntity: { default: "''", model: true, kind: 'string' },
          multiEntityPickerEnabled: { default: 'false', reflect: true },
          selectedFields: { default: '[]', model: true },
          sortBy: { default: '[]', model: true },
          disabled: { default: 'false', reflect: true },
          messages: {},
          maxDepth: { default: '32', kind: 'number' },
          showPreview: { default: 'false', reflect: true },
          showSavedQueries: { default: 'false', reflect: true },
          savedQueries: { default: '[]' },
        },
      },
      outputs: {
        queryChange: { type: 'Expression', doc: 'The user edited the query.' },
        rootEntityChange: { type: 'string', doc: 'The user picked another entity in the toolbar.' },
        selectedFieldsChange: { type: 'string[]', doc: 'The projected columns changed.' },
        sortByChange: { type: 'SortDescriptor[]', doc: 'The sort changed.' },
        saveQuery: { type: 'SaveQueryDetail', doc: 'Save the current query under a name.' },
        loadQuery: { type: 'SavedQueryNameDetail', doc: 'Load the named saved query.' },
        deleteQuery: { type: 'SavedQueryNameDetail', doc: 'Delete the named saved query.' },
      },
    },
  },
} satisfies ComponentGroup;
