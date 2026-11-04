import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The list group's manifest (#458 M5): `bs-list-group` / `bs-list-group-item`
 * (Angular), `BsListGroup` / `BsListGroupItem` (React, Vue) and
 * `mp-list-group` / `mp-list-group-item` (Lit).
 */
export default {
  group: 'list-group',
  style: { scope: 'list-group', bootstrap: ['list-group'] },
  components: {
    'list-group': {
      core: 'listGroupCore',
      doc: "Bootstrap's list group: a `role=\"list\"` of `list-group-item`s. `flush` drops the outer borders.",
      inputs: {
        type: 'ListGroupInputs',
        fields: {
          flush: { default: 'false', reflect: true },
        },
      },
    },
    'list-group-item': {
      core: 'listGroupItemCore',
      doc: 'One item of a list group. `active` marks the current one (`aria-current`); `color` is a contextual colour.',
      inputs: {
        type: 'ListGroupItemInputs',
        fields: {
          active: { default: 'false', reflect: true },
          disabled: { default: 'false', reflect: true },
          color: { default: 'null', kind: 'string' },
        },
      },
    },
  },
} satisfies ComponentGroup;
