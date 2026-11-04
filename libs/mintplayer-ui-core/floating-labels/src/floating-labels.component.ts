import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The floating label's manifest (#458 M5): `bs-floating-label` (Angular),
 * `BsFloatingLabel` (React, Vue) and `mp-floating-label` (Lit).
 */
export default {
  group: 'floating-labels',
  style: { scope: 'floating-labels', bootstrap: ['forms'] },
  components: {
    'floating-label': {
      core: 'floatingLabelCore',
      doc: "Bootstrap's `.form-floating` around a control and then its `<label>`; a label without `for` is associated with the control.",
    },
  },
} satisfies ComponentGroup;
