import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The radio group's manifest (#458 M3): `@mintplayer/nx-component-compiler`
 * generates `bs-radio` / `bs-radio-group` (Angular), `BsRadio` / `BsRadioGroup`
 * (React, Vue) and `mp-radio` / `mp-radio-group` (Lit) from it, the cores in
 * `radio.core.ts` and the templates in `templates/`. Angular adds the attribute
 * form `[bsRadioGroup]` by hand (ng-bootstrap `radio`), for a group on a host it
 * does not own (a `<tbody>`, a table cell, a button group).
 */
export default {
  group: 'radio',
  style: { scope: 'radio', bootstrap: ['forms'] },
  components: {
    radio: {
      core: 'radioCore',
      doc: [
        'A native `<input type=radio>` in Bootstrap\'s `.form-check` or `.btn-check` markup (#458).',
        '',
        'Inside a radio group it takes the group\'s `name` and selection, so the browser supplies',
        'one-of-N, the single tab stop and arrow-key selection, with JavaScript off as well. An',
        '`aria-label` on the component, or `inputLabel`, names the input.',
      ].join('\n'),
      inputs: {
        type: 'RadioInputs',
        fields: {
          type: { default: "'radio'", kind: 'string', reflect: true },
          color: { default: "'secondary'", kind: 'string' },
          inline: { default: 'false' },
          value: { default: 'null', kind: 'string' },
          checked: { default: 'false', model: true },
          name: { default: 'null', kind: 'string' },
          disabled: { default: 'false', reflect: true },
          required: { default: 'false' },
          invalid: { default: 'false' },
          errorText: { default: 'null', kind: 'string' },
          inputLabel: { default: 'null', kind: 'string' },
        },
      },
      outputs: {
        checkedChange: { type: 'boolean', doc: 'The input became checked (a radio never unchecks itself).' },
      },
    },
    'radio-group': {
      core: 'radioGroupCore',
      provides: 'RADIO_GROUP',
      doc: [
        'A `role=radiogroup` element around radios (#458). It hands them one `name`, so they are native',
        'radios of one set. `value` is two-way. Name it with `aria-label` / `aria-labelledby`. A radio',
        'list nested inside (a table cell) is its own group: each group reacts only to its own radios.',
      ].join('\n'),
      inputs: {
        type: 'RadioGroupInputs',
        fields: {
          name: { default: 'null', kind: 'string' },
          value: { default: 'null', kind: 'string', model: true },
          disabled: { default: 'false', reflect: true },
          required: { default: 'false' },
        },
      },
      outputs: {
        valueChange: { type: 'string | null', doc: 'The user picked a radio of this group.' },
      },
    },
  },
} satisfies ComponentGroup;
