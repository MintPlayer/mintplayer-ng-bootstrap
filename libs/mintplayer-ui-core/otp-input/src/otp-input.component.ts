import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The one-time-code input's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-otp-input` (Angular), `BsOtpInput` (React, Vue) and `mp-otp-input`
 * (Lit) from it, the core in `otp-input.core.ts` and the template in `templates/`.
 */
export default {
  group: 'otp-input',
  style: { scope: 'otp-input' },
  components: {
    'otp-input': {
      core: 'otpInputCore',
      doc: [
        'A segmented one-time-code input (#437): one real `<input>` behind decorative boxes.',
        '',
        'With JavaScript off it is a plain `.form-control` that takes the code and submits under `name`.',
        '`groups` sets the boxes (`[1,1,1,1,1,1]`, or `[5,5,5,5,5]` for a product key). `value` is two-way;',
        '`complete` fires when the user fills the last box. An `aria-label` on the component names the input.',
      ].join('\n'),
      inputs: {
        type: 'OtpInputInputs',
        fields: {
          groups: { default: '[1, 1, 1, 1, 1, 1]' },
          type: { default: "'numeric'" },
          letterCase: { default: "'upper'" },
          size: { default: "'md'" },
          disabled: { default: 'false' },
          required: { default: 'false' },
          invalid: { default: 'false' },
          errorText: { kind: 'string' },
          name: { kind: 'string' },
          inputLabel: { kind: 'string' },
          value: { default: "''", kind: 'string', model: true },
        },
      },
      outputs: {
        valueChange: { type: 'string', doc: 'Every keystroke, paste and clear: the current, possibly partial, code.' },
        complete: { type: 'string', doc: 'The user filled the last box.' },
      },
      methods: {
        type: 'OtpInputMethods',
        fields: {
          clear: { doc: 'Empties the code, and reports it.' },
          focusInput: { doc: 'Moves focus into the input.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
