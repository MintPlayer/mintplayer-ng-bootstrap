import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The pagination's manifest (#458 M4): `@mintplayer/nx-component-compiler`
 * generates `bs-pagination` (Angular), `BsPagination` (React, Vue) and
 * `mp-pagination` (Lit) from it, the core in `pagination.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'pagination',
  style: { scope: 'pagination', bootstrap: ['pagination'] },
  components: {
    pagination: {
      core: 'paginationCore',
      doc: [
        'Bootstrap\'s pagination in a `<nav>` landmark (#458). `selectedPageNumber` is two-way.',
        '',
        'Pages are buttons; with `hrefFor` they are real links, so the server-rendered page navigates',
        'with JavaScript off, and a plain click selects in place once hydrated. A consumer',
        '`aria-label` names the `<nav>`; `labels` localizes the arrows and page names.',
      ].join('\n'),
      inputs: {
        type: 'PaginationInputs',
        fields: {
          pageNumbers: { default: '[]', kind: false },
          selectedPageNumber: { default: '1', kind: 'number', model: true },
          numberOfBoxes: { default: '0', kind: 'number' },
          showArrows: { default: 'true' },
          size: { default: "'medium'", kind: 'string' },
          labels: { default: 'null', kind: false },
          hrefFor: { default: 'null', kind: false },
        },
      },
    },
  },
} satisfies ComponentGroup;
