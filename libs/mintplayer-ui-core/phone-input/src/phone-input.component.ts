import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The phone input's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-phone-input` (Angular), `BsPhoneInput` (React, Vue) and
 * `mp-phone-input` (Lit) from it, the core in `phone-input.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'phone-input',
  style: { scope: 'phone-input' },
  components: {
    'phone-input': {
      core: 'phoneInputCore',
      doc: [
        'A phone-number field (#437): country picker with flags, dial code, and a number input that formats as',
        'the user types. `value` is two-way E.164 (`+32470123456`); `country` is two-way too.',
        '',
        'With JavaScript off it is a plain country select and tel input; the typed text submits under `name`.',
        'An `aria-label` on the component names the number input; `countryLabel` names the picker.',
      ].join('\n'),
      inputs: {
        type: 'PhoneInputInputs',
        fields: {
          value: { default: 'null', kind: 'string', model: true },
          country: { default: 'null', kind: 'string', model: true },
          defaultCountry: { kind: 'string' },
          locale: { kind: 'string' },
          preferredCountries: { default: 'null', kind: 'string' },
          allowedCountries: { default: 'null', kind: 'string' },
          disabled: { default: 'false', reflect: true },
          required: { default: 'false', reflect: true },
          invalid: { default: 'false', reflect: true },
          errorText: { kind: 'string' },
          placeholder: { kind: 'string' },
          autocomplete: { default: "'tel-national'" },
          name: { kind: 'string' },
          inputLabel: { kind: 'string' },
          countryLabel: { kind: 'string' },
        },
      },
      outputs: {
        valueChange: { type: 'string | null', doc: 'The E.164 value changed (null while empty).' },
        countryChange: { type: 'string', doc: 'The user picked a country, or typed a `+XX` that switched it.' },
        phoneChange: { type: 'PhoneChangeEventDetail', doc: 'Every edit, pick and rules load: the value with its parts and validity.' },
      },
      methods: {
        type: 'PhoneInputMethods',
        fields: {
          focusInput: { doc: 'Moves focus into the number field, not the country picker.' },
          whenReady: { doc: 'Settles once the flags and the rules in flight have been applied.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
