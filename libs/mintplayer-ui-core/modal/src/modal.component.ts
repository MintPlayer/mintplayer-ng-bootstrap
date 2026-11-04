import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The modal's manifest (#458 M6): `bs-modal` (Angular), `BsModal` (React, Vue)
 * and `mp-modal` (Lit). The header and footer are slots; the dialog renders
 * into a body host and opens on the overlay stack.
 */
export default {
  group: 'modal',
  style: { scope: 'modal', bootstrap: ['modal', 'close', 'transitions'] },
  components: {
    modal: {
      core: 'modalCore',
      doc: [
        "Bootstrap's modal dialog, rendered at the end of `<body>`. `open` is two-way. The `header` slot names the",
        'dialog; the `footer` slot holds its actions. Any element inside with `data-bs-dismiss="modal"` closes it.',
      ].join('\n'),
      inputs: {
        type: 'ModalInputs',
        fields: {
          open: { default: 'false', model: true },
          scrollable: { default: 'false' },
          centered: { default: 'false' },
          size: { default: 'null', kind: 'string' },
          closeOnEscape: { default: 'true' },
          closeOnBackdrop: { default: 'true' },
          closeButton: { default: 'true' },
          closeLabel: { default: "'Close'", kind: 'string' },
        },
      },
    },
  },
} satisfies ComponentGroup;
