import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The checkbox group's manifest (#458 M4): `@mintplayer/nx-component-compiler`
 * generates `bs-checkbox` / `bs-toggle-button` / `bs-checkbox-group` (Angular),
 * `BsCheckbox` / `BsToggleButton` / `BsCheckboxGroup` (React, Vue) and
 * `mp-checkbox` / `mp-toggle-button` / `mp-checkbox-group` (Lit) from it, the
 * cores in `checkbox.ts` and the templates in `templates/`. Angular adds the
 * attribute form `[bsCheckboxGroup]` by hand (ng-bootstrap `checkbox`), for a
 * group on a host it does not own (a `<tbody>`, a table cell).
 */

const shared = {
  color: { default: "'primary'", kind: 'string' },
  checked: { default: 'false', model: true },
  name: { default: 'null', kind: 'string' },
  value: { default: 'null', kind: 'string' },
  disabled: { default: 'false', reflect: true },
  required: { default: 'false' },
  invalid: { default: 'false' },
  errorText: { default: 'null', kind: 'string' },
  inputLabel: { default: 'null', kind: 'string' },
} as const;

export default {
  group: 'checkbox',
  style: { scope: 'checkbox', bootstrap: ['forms'] },
  components: {
    checkbox: {
      core: 'checkboxCore',
      doc: [
        'A native `<input type=checkbox>` in Bootstrap\'s `.form-check`, `.form-switch` or `.btn-check`',
        'markup (#458). It submits, toggles and announces with JavaScript off. `checked` and',
        '`indeterminate` are two-way; a user toggle clears the mixed state. Inside a checkbox group it',
        'takes the group\'s name (`<name>[]`) and is checked when its `value` is selected. An',
        '`aria-label` on the component, or `inputLabel`, names the input.',
      ].join('\n'),
      inputs: {
        type: 'CheckboxInputs',
        fields: {
          type: { default: "'checkbox'", kind: 'string', reflect: true },
          ...shared,
          indeterminate: { default: 'false', model: true },
        },
      },
      outputs: {
        checkedChange: { type: 'boolean', doc: 'The user checked or cleared the box.' },
        indeterminateChange: { type: 'boolean', doc: 'A user toggle cleared the mixed state.' },
      },
    },
    'toggle-button': {
      core: 'toggleButtonCore',
      template: 'checkbox.view.vue',
      doc: [
        'A single Bootstrap on/off button (#458): a checkbox whose type is fixed to `toggle_button`, an',
        '`input.btn-check` + `label.btn` that keeps the native checkbox role. `checked` is two-way.',
      ].join('\n'),
      inputs: { type: 'ToggleButtonInputs', fields: shared },
      outputs: {
        checkedChange: { type: 'boolean', doc: 'The user pressed or released the button.' },
      },
    },
    'checkbox-group': {
      core: 'checkboxGroupCore',
      provides: 'CHECKBOX_GROUP',
      doc: [
        'A `role=group` element around checkboxes (#458). They submit as `<name>[]`, and `value` (two-way)',
        'is the list of the checked ones\' values. Name it with `aria-label` / `aria-labelledby`. A group',
        'nested inside is its own: each group reacts only to its own checkboxes.',
      ].join('\n'),
      inputs: {
        type: 'CheckboxGroupInputs',
        fields: {
          name: { default: 'null', kind: 'string' },
          value: { default: '[]', kind: false, model: true },
          disabled: { default: 'false', reflect: true },
        },
      },
      outputs: {
        valueChange: { type: 'CheckboxGroupValue', doc: 'The user checked or cleared a checkbox of this group.' },
      },
    },
  },
} satisfies ComponentGroup;
