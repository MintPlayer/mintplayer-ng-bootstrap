import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The close button's manifest (#458 M5): `bs-close` (Angular), `BsClose`
 * (React, Vue) and `mp-close` (Lit).
 */
export default {
  group: 'close',
  style: { scope: 'close', bootstrap: ['close'] },
  components: {
    close: {
      core: 'closeCore',
      doc: "Bootstrap's close button: a real `<button class=\"btn-close\">` named by `label`; listen for its native `click`.",
      inputs: {
        type: 'CloseInputs',
        fields: {
          label: { default: "'Close'", kind: 'string' },
          disabled: { default: 'false', reflect: true },
        },
      },
    },
  },
} satisfies ComponentGroup;
