import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The navbar toggler's manifest (#458 M5): `bs-navbar-toggler` (Angular),
 * `BsNavbarToggler` (React, Vue) and `mp-navbar-toggler` (Lit).
 */
export default {
  group: 'navbar-toggler',
  style: { scope: 'navbar-toggler', bootstrap: ['navbar'] },
  components: {
    'navbar-toggler': {
      core: 'navbarTogglerCore',
      doc: [
        'A hamburger button that morphs into a cross while `open` (two-way). `controls` names the region it',
        'shows and hides; with `toggleOnClick` off it only reports state its region owns.',
      ].join('\n'),
      inputs: {
        type: 'NavbarTogglerInputs',
        fields: {
          open: { default: 'false', model: true },
          toggleOnClick: { default: 'true' },
          label: { default: "'Toggle navigation'", kind: 'string' },
          controls: { default: 'null', kind: 'string' },
        },
      },
      outputs: {
        openChange: { type: 'boolean', doc: 'The user toggled the button.' },
      },
    },
  },
} satisfies ComponentGroup;
