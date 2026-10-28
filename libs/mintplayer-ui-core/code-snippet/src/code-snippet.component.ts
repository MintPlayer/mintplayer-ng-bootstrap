import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The code snippet's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-code-snippet` (Angular), `BsCodeSnippet` (React, Vue) and
 * `mp-code-snippet` (Lit) from it, the core in `code-snippet.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'code-snippet',
  styles: [{ scope: 'CODE_SNIPPET_SCOPE', sheet: 'codeSnippetScopedStyles' }],
  components: {
    'code-snippet': {
      core: 'codeSnippetCore',
      doc: [
        'A code listing with lazy syntax highlighting, a copy button, optional line numbers and per-line annotations.',
        '',
        'The server renders the escaped source, so it reads with JavaScript off; highlighting follows hydration',
        'and the copy button is disabled until then. Annotation kinds are classes (`annotation-<kind>`) on the row.',
      ].join('\n'),
      inputs: {
        type: 'CodeSnippetInputs',
        fields: {
          code: { default: "''", kind: 'string' },
          language: { default: "''", kind: 'string' },
          theme: { default: "'auto'", kind: 'string' },
          wrap: { default: 'false', kind: 'boolean' },
          lineNumbers: { default: 'false', kind: 'boolean' },
          startLine: { default: '1', kind: 'number' },
          annotations: { default: 'null', kind: false },
          activeLine: { default: 'null', kind: 'number' },
          lineHref: { default: 'null', kind: false },
          label: { default: "''", kind: 'string' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        languageDetected: { type: 'string', doc: 'The resolved grammar changed (`code` when the source stays plain).' },
        lineActivate: { type: 'CodeLineActivation', doc: 'A line link was clicked; call `preventDefault()` on it to navigate yourself.' },
      },
      methods: {
        type: 'CodeSnippetMethods',
        fields: {
          scrollToLine: { doc: 'Scroll a line into view.' },
          whenHighlighted: { doc: 'Settles once the in-flight highlight has been applied.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
