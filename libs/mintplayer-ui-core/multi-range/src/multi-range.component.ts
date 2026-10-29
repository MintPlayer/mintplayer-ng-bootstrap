import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The multi-range slider's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-multi-range` (Angular), `BsMultiRange` (React, Vue) and `mp-multi-range`
 * (Lit) from it, the core in `multi-range.core.ts` and the template in `templates/`.
 */
export default {
  group: 'multi-range',
  style: { scope: 'multi-range' },
  components: {
    'multi-range': {
      core: 'multiRangeCore',
      doc: [
        'A slider with several thumbs on one track (#437): each thumb is a native `<input type="range">`.',
        '',
        'With JavaScript off the thumbs drag, step and submit under `name`. Thumbs never pass each other;',
        '`minDistance` keeps a gap between neighbours. `value` is two-way, one entry per thumb.',
        '`valueInput` fires while a thumb moves, `valueChange` when the move is committed.',
      ].join('\n'),
      inputs: {
        type: 'MultiRangeInputs',
        fields: {
          min: { default: '0' },
          max: { default: '100' },
          step: { default: '1' },
          minDistance: { default: '0' },
          orientation: { default: "'horizontal'", reflect: true },
          disabled: { default: 'false' },
          name: { kind: 'string' },
          label: { kind: 'string' },
          thumbLabels: { default: 'null', kind: false },
          formatValue: { default: 'null', kind: false },
          value: { default: 'null', kind: false, model: true },
        },
      },
      outputs: {
        valueInput: { type: 'number[]', doc: 'While a thumb moves: every pointer move and key step.' },
        valueChange: { type: 'number[]', doc: 'A move committed: the pointer released, or a key step.' },
      },
      methods: {
        type: 'MultiRangeMethods',
        fields: {
          getValues: { doc: 'A copy of the current values.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
