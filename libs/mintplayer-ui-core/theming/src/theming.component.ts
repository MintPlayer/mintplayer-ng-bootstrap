import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The theme toggle's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-theme-toggle` (Angular), `BsThemeToggle` (React, Vue) and
 * `mp-theme-toggle` (Lit) from it, the core in `theme-toggle.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'theming',
  styles: [{ scope: 'THEME_TOGGLE_SCOPE', sheet: 'themeToggleScopedStyles' }],
  components: {
    'theme-toggle': {
      core: 'themeToggleCore',
      doc: [
        'A button that cycles the document colour mode through `modes` (dark-mode D7, #437).',
        '',
        'Its name is the next mode (the action), its description the current one. The mode lives in the',
        'theme store, so a framework service or another tab re-renders it. A toggle cannot work without',
        'JavaScript, so the button is disabled until it hydrates.',
      ].join('\n'),
      inputs: {
        type: 'ThemeToggleInputs',
        fields: {
          modes: { default: 'null', kind: false },
        },
      },
    },
  },
} satisfies ComponentGroup;
