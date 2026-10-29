import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The signature pad's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-signature-pad` (Angular), `BsSignaturePad` (React, Vue) and
 * `mp-signature-pad` (Lit) from it, the core in `signature-pad.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'signature-pad',
  style: { scope: 'signature-pad' },
  components: {
    'signature-pad': {
      core: 'signaturePadCore',
      doc: [
        'Freehand signature capture with a typed alternative (#437).',
        '',
        'Drawing is pointer-only; the typed field under the canvas is the keyboard path, painted onto',
        'the canvas in a script font and stored on `Signature.text`. With JavaScript off the pad renders',
        'inert: the canvas cannot draw, so the field and the buttons are disabled until it hydrates.',
      ].join('\n'),
      inputs: {
        type: 'SignaturePadInputs',
        fields: {
          signature: { default: '{ strokes: [] }', kind: false, model: true },
          width: { default: '500', kind: 'number', reflect: true },
          height: { default: '300', kind: 'number', reflect: true },
          showAccessibilityToggle: { default: 'true', kind: 'boolean' },
          disabled: { default: 'false', kind: 'boolean', reflect: true },
          required: { default: 'false', kind: 'boolean' },
          invalid: { default: 'false', kind: 'boolean', reflect: true },
          errorText: { default: 'null', kind: 'string' },
          inputLabel: { default: 'null', kind: 'string' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        signatureChange: { type: 'Signature', doc: 'Every stroke point, typed character, undo and clear: the current signature.' },
      },
      methods: {
        type: 'SignaturePadMethods',
        fields: {
          undo: { doc: 'Remove the most recent stroke (ignored when disabled).' },
          clear: { doc: 'Wipe the strokes and the typed text (ignored when disabled).' },
          focusInput: { doc: 'Move focus to the typed field.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
