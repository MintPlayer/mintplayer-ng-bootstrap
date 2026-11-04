import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The scrollspy's manifest (#458 M7): `bs-scrollspy` (Angular), `BsScrollspy`
 * (React, Vue) and `mp-scrollspy` (Lit).
 */
export default {
  group: 'scrollspy',
  style: { scope: 'scrollspy' },
  components: {
    scrollspy: {
      core: 'scrollspyCore',
      doc: [
        'A table of contents beside the content that follows the reader. The sections are the content\'s',
        'elements marked `data-scrollspy`; the active one is `aria-current="location"`. The list is built once',
        'hydrated (no-JS tier 2).',
      ].join('\n'),
      inputs: {
        type: 'ScrollspyInputs',
        fields: {
          label: { default: "'Section navigation'", kind: 'string', doc: 'Names the section navigation; a consumer `aria-label` wins.' },
          scrollContainer: { default: 'null', kind: false, doc: 'The element that scrolls; null finds the nearest scrolling ancestor, else the window.' },
          offset: { default: '0', kind: 'number', doc: 'Pixels between the viewport top and the trigger line when the window scrolls (a fixed navbar).' },
        },
      },
    },
  },
} satisfies ComponentGroup;
