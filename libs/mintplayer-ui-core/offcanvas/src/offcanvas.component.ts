import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The offcanvas's manifest (#458 M6): `bs-offcanvas` (Angular), `BsOffcanvas`
 * (React, Vue) and `mp-offcanvas` (Lit). The header is a slot; the panel
 * renders into a body host and opens on the overlay stack.
 */
export default {
  group: 'offcanvas',
  style: { scope: 'offcanvas', bootstrap: ['offcanvas', 'close', 'transitions'] },
  components: {
    offcanvas: {
      core: 'offcanvasCore',
      doc: [
        "Bootstrap's offcanvas panel, rendered at the end of `<body>`. `open` is two-way; `position` picks the edge.",
        'With `backdrop` it is modal. The `header` slot names it; any element inside with',
        '`data-bs-dismiss="offcanvas"` closes it.',
      ].join('\n'),
      inputs: {
        type: 'OffcanvasInputs',
        fields: {
          open: { default: 'false', model: true },
          position: { default: "'start'", kind: 'string' },
          size: { default: 'null', kind: 'number' },
          backdrop: { default: 'true' },
          closeOnBackdrop: { default: 'true' },
          closeOnEscape: { default: 'true' },
          closeButton: { default: 'true' },
          closeLabel: { default: "'Close'", kind: 'string' },
          noPadding: { default: 'false' },
        },
      },
    },
  },
} satisfies ComponentGroup;
