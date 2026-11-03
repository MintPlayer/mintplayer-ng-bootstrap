import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The input group's manifest (#458 M3): `@mintplayer/nx-component-compiler`
 * generates `bs-input-group` (Angular), `BsInputGroup` (React, Vue) and
 * `mp-input-group` (Lit) from it, the core in `input-group.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'input-group',
  style: { scope: 'input-group', bootstrap: ['forms'] },
  components: {
    'input-group': {
      core: 'inputGroupCore',
      doc: "Bootstrap's input group: joins its children into one visually continuous control. A `label` names it and makes it a `group`.",
      inputs: {
        type: 'InputGroupInputs',
        fields: {
          size: { default: "'md'", kind: 'string', reflect: true },
          label: { default: 'null', kind: 'string' },
        },
      },
    },
  },
} satisfies ComponentGroup;
