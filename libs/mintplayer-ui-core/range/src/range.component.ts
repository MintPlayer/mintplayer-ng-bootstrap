import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The range's manifest (#458 M5): `bs-range` (Angular, a ControlValueAccessor),
 * `BsRange` (React, Vue `v-model:value`) and `mp-range` (Lit).
 */
export default {
  group: 'range',
  style: { scope: 'range', bootstrap: ['forms'] },
  components: {
    range: {
      core: 'rangeCore',
      doc: "Bootstrap's `.form-range`: a native slider from `min` to `max` in `step`s. `value` is two-way; `label` names it when no `<label for>` does.",
      inputs: {
        type: 'RangeInputs',
        fields: {
          value: { default: '0', kind: 'number', model: true },
          min: { default: '0', kind: 'number' },
          max: { default: '10', kind: 'number' },
          step: { default: '1', kind: 'number' },
          disabled: { default: 'false' },
          label: { default: 'null', kind: 'string' },
        },
      },
      outputs: {
        valueChange: { type: 'number', doc: 'The user moved the slider.' },
      },
    },
  },
} satisfies ComponentGroup;
