import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The navbar group's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-navbar` & co. (Angular), `BsNavbar` & co. (React, Vue) and
 * `mp-navbar` & co. (Lit) from it, the cores in `navbar.core.ts` and the
 * templates in `templates/`.
 */
export default {
  group: 'navbar',
  style: { scope: 'navbar', bootstrap: ['nav', 'navbar', 'dropdown'] },
  components: {
    navbar: {
      core: 'navbarCore',
      doc: [
        'Bootstrap navbar with a no-JS collapse and native `<details>` dropdowns (#437).',
        '',
        'The server-rendered page is the working navbar: the collapse is a checkbox and every',
        'dropdown a `<details>`, both of which work with JavaScript off. An `aria-label` names',
        'the landmark. The `brand` slot holds the brand; the `toggler` slot replaces the three',
        'hamburger bars and reads the open state from `--mp-navbar-expanded: 0|1`.',
      ].join('\n'),
      inputs: {
        type: 'NavbarInputs',
        fields: {
          breakpoint: { default: "'md'", reflect: true },
          color: { kind: 'string', reflect: true },
          expanded: { default: 'false', reflect: true, model: true },
          positioning: { kind: 'string', reflect: true },
          labels: {},
        },
      },
      outputs: {
        expandedChange: { type: 'NavbarExpandedChangeEventDetail', doc: 'The collapse opened or closed through the bar.' },
      },
      methods: { type: 'NavbarMethods', fields: { toggle: { doc: 'Opens or closes the collapse (flips it without an argument), and reports it.' } } },
    },
    'navbar-nav': {
      core: 'navbarNavCore',
      doc: 'A group of navbar items; `align="end"` pushes it to the far side when the bar is wide.',
      inputs: { type: 'NavbarNavInputs', fields: { align: { default: "'start'", reflect: true } } },
    },
    'navbar-item': {
      core: 'navbarItemCore',
      doc: 'One entry around a consumer link: a `.nav-item` in a nav group, a `.dropdown-item` in a dropdown.',
      inputs: { type: 'NavbarItemInputs', fields: { active: { default: 'false', reflect: true }, disabled: { default: 'false', reflect: true } } },
    },
    'navbar-dropdown': {
      core: 'navbarDropdownCore',
      provides: 'NAVBAR_NESTING',
      doc: 'A navbar dropdown, or a submenu when nested: a native `<details>`, so it opens with JavaScript off.',
      inputs: { type: 'NavbarDropdownInputs', fields: { label: { kind: 'string' }, active: { default: 'false', reflect: true } } },
    },
  },
} satisfies ComponentGroup;
