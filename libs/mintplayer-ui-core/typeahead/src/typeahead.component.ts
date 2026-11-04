import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The typeahead's manifest (#458 M3): `@mintplayer/nx-component-compiler`
 * generates `bs-typeahead` (Angular), `BsTypeahead` (React, Vue) and
 * `mp-typeahead` (Lit) from it, the core in `typeahead.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'typeahead',
  style: { scope: 'typeahead', bootstrap: ['forms', 'dropdown'] },
  components: {
    typeahead: {
      core: 'typeaheadCore',
      doc: [
        'A text input with asynchronous suggestions and free text (#436). The value is the term; a',
        'pick writes its text into the input and emits `itemSelect`. The `provider` answers with a',
        'Promise or an Observable, and a newer term aborts the previous request. Server-rendered as a',
        'real, named `<input>` that submits free text with JavaScript off. Slot: `item` (a',
        "suggestion's content, with the `item` and the `term`). An `aria-label` names the input.",
      ].join('\n'),
      inputs: {
        type: 'TypeaheadInputs',
        fields: {
          provider: { default: 'null', kind: false },
          debounceMs: { default: '200', kind: 'number' },
          minLength: { default: '1', kind: 'number' },
          disabled: { default: 'false', kind: 'boolean', reflect: true },
          itemText: { default: 'null', kind: false },
          itemKey: { default: 'null', kind: false },
          name: { default: 'null', kind: 'string' },
          inputLabel: { default: 'null', kind: 'string' },
          loadingLabel: { default: 'null', kind: 'string' },
          noResultsLabel: { default: 'null', kind: 'string' },
          resultsLabel: { default: 'null', kind: false },
          errorText: { default: 'null', kind: 'string' },
          value: { default: "''", kind: 'string', model: true },
        },
      },
      outputs: {
        itemSelect: { type: 'TypeaheadItemSelectDetail', doc: 'A suggestion was picked, with the text it wrote.' },
        termSubmit: { type: 'string', doc: 'Enter with no suggestion highlighted.' },
        openChange: { type: 'boolean', doc: 'The list opened (true) or closed (false).' },
        searchStart: { type: 'string', doc: 'A provider call started for this term.' },
        loadError: { type: 'unknown', doc: 'The provider rejected.' },
      },
      methods: {
        type: 'TypeaheadMethods',
        fields: {
          focus: { doc: 'Focus the input.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
