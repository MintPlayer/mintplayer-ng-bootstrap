import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The select group's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-select` (Angular), `BsSelect` (React, Vue) and `mp-select` (Lit)
 * from it, the core in `select.core.ts` and the template in `templates/`.
 */
export default {
  group: 'select',
  style: { scope: 'select', bootstrap: ['forms'] },
  components: {
    select: {
      core: 'selectCore',
      doc: [
        'Bootstrap `.form-select` around a native `<select>` (#437): it works and submits with JavaScript off.',
        '',
        'Give it `options`, or put `<option>` / `<optgroup>` children inside. `value` (or `values` when',
        '`multiple`) is two-way. An `aria-label` on the component names the select; so does `inputLabel`.',
        'The `option` slot renders rich option content where the engine supports customizable select.',
      ].join('\n'),
      inputs: {
        type: 'SelectInputs',
        fields: {
          size: { default: "'md'", reflect: true },
          multiple: { default: 'false', reflect: true },
          numberVisible: { kind: 'number' },
          disabled: { default: 'false', reflect: true },
          required: { default: 'false', reflect: true },
          invalid: { default: 'false', reflect: true },
          errorText: { kind: 'string' },
          name: { kind: 'string' },
          inputLabel: { kind: 'string' },
          value: { default: 'null', kind: 'string', model: true },
          values: { default: '[]', model: true },
          options: {},
        },
      },
      outputs: {
        valueChange: { type: 'SelectChangeEventDetail', doc: 'The user picked: the value, and every value of a multiple select.' },
      },
    },
  },
} satisfies ComponentGroup;
