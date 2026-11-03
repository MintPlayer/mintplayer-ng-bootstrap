import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The spinner's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-spinner` (Angular), `BsSpinner` (React, Vue) and `mp-spinner`
 * (Lit) from it, the core in `spinner.core.ts` and the template in `templates/`.
 */
export default {
  group: 'spinner',
  style: { scope: 'spinner', bootstrap: ['spinners'] },
  components: {
    spinner: {
      core: 'spinnerCore',
      doc: "Bootstrap's spinner: a `role=\"status\"` loading indicator whose visually hidden `label` a screen reader announces (#452).",
      inputs: {
        type: 'SpinnerInputs',
        fields: {
          type: { default: "'border'", kind: 'string', reflect: true },
          color: { default: 'null', kind: 'string', reflect: true },
          small: { default: 'false', reflect: true },
          label: { default: "'Loading…'", kind: 'string' },
        },
      },
    },
  },
} satisfies ComponentGroup;
