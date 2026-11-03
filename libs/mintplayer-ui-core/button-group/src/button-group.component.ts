import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The button group's manifest (#458 M5): `bs-button-group` (Angular),
 * `BsButtonGroup` (React, Vue) and `mp-button-group` (Lit).
 */
export default {
  group: 'button-group',
  style: { scope: 'button-group', bootstrap: ['button-group'] },
  components: {
    'button-group': {
      core: 'buttonGroupCore',
      doc: "Bootstrap's button group: a `role=\"group\"` `.btn-group` named by `label`. It joins direct `.btn` children and buttons rendered inside a hosted child (a toggle button) alike.",
      inputs: {
        type: 'ButtonGroupInputs',
        fields: {
          label: { default: 'null', kind: 'string' },
          vertical: { default: 'false', reflect: true },
          size: { default: 'null', kind: 'string', reflect: true },
        },
      },
    },
  },
} satisfies ComponentGroup;
