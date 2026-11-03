import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The nav group's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-nav` / `bs-nav-item` (Angular), `BsNav` / `BsNavItem` (React,
 * Vue) and `mp-nav` / `mp-nav-item` (Lit) from it, the cores in `nav.core.ts`
 * and the templates in `templates/`.
 */
export default {
  group: 'nav',
  style: { scope: 'nav', bootstrap: ['nav'] },
  components: {
    nav: {
      core: 'navCore',
      doc: [
        "Bootstrap's nav: a list of `bs-nav-item`s, plain or as tabs, pills or underline (#452).",
        '',
        'It ships the nav part, so a page that renders one needs no install of its own.',
      ].join('\n'),
      inputs: {
        type: 'NavInputs',
        fields: {
          variant: { default: 'null', kind: 'string', reflect: true },
          fill: { default: 'false', reflect: true },
          justified: { default: 'false', reflect: true },
          cardHeader: { default: 'false', reflect: true },
        },
      },
    },
    'nav-item': {
      core: 'navItemCore',
      doc: 'One nav entry around a consumer link, which becomes its `.nav-link`; `class="active"` marks the current one.',
    },
  },
} satisfies ComponentGroup;
