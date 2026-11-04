import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The placeholder's manifest (#458 M5): `bs-placeholder` (Angular),
 * `BsPlaceholder` (React, Vue) and `mp-placeholder` (Lit).
 */
export default {
  group: 'placeholder',
  style: { scope: 'placeholder', bootstrap: ['placeholders'] },
  components: {
    placeholder: {
      core: 'placeholderCore',
      doc: [
        'A loading region: while `loading`, the content\'s elements marked `data-placeholder-field` render as',
        "Bootstrap's glowing skeleton bars and the region is `aria-busy`; when it ends, `loadedText` is said once.",
      ].join('\n'),
      inputs: {
        type: 'PlaceholderInputs',
        fields: {
          loading: { default: 'false', reflect: true },
          loadedText: { default: "'Loading complete'", kind: 'string' },
        },
      },
    },
  },
} satisfies ComponentGroup;
