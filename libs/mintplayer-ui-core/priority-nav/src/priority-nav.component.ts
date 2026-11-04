import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The priority nav's manifest (#458 M7): `bs-priority-nav` (Angular), `BsPriorityNav` (React,
 * Vue) and `mp-priority-nav` (Lit). Items are data; the `itemTemplate` slot renders one
 * (`<a *bsPriorityNavItemTemplate="let item">` in Angular).
 */
export default {
  group: 'priority-nav',
  style: { scope: 'priority-nav' },
  components: {
    'priority-nav': {
      core: 'priorityNavCore',
      doc: 'A horizontal navigation that keeps as many `items` visible as fit and moves the rest, least important (highest `priority`) first, into a "More" disclosure. Works without JavaScript through `hideBelow` breakpoints.',
      inputs: {
        type: 'PriorityNavInputs',
        fields: {
          items: { default: '[]', kind: false },
          moreLabel: { default: "'More'", kind: 'string' },
          collapseAt: { default: 'null', kind: 'string', doc: 'Below this breakpoint every item is in the overflow.' },
          overflowFrom: { default: "'end'", kind: 'string' },
          hideEmptyMore: { default: 'true' },
          label: { default: "'Navigation'", kind: 'string', doc: 'Names the navigation landmark; a consumer `aria-label` wins.' },
        },
      },
      outputs: {
        overflowChange: { type: 'PriorityNavItem[]', doc: 'The items in the overflow changed.' },
      },
    },
  },
} satisfies ComponentGroup;
