import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The sticky footer's manifest (#458 M5): `bs-sticky-footer` (Angular),
 * `BsStickyFooter` (React, Vue) and `mp-sticky-footer` (Lit), inside an element
 * marked with the `stickyFooterParent` directive (`[bsStickyFooterParent]`,
 * `useBsStickyFooterParent`, `v-bs-sticky-footer-parent`, Lit `bsStickyFooterParent`).
 */
export default {
  group: 'sticky-footer',
  style: { scope: 'sticky-footer' },
  components: {
    'sticky-footer': {
      core: 'stickyFooterCore',
      doc: 'A `<footer>` pinned to the bottom of its `stickyFooterParent` while the content is shorter than `--mp-sticky-footer-min-height` (default `100dvh`).',
    },
  },
  directives: {
    'sticky-footer-parent': {
      core: 'stickyFooterParentCore',
      doc: 'Makes the element a flex column at least `--mp-sticky-footer-min-height` tall, so the sticky footer inside it ends up at the bottom.',
    },
  },
} satisfies ComponentGroup;
