import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The badge's manifest (#458 M5): `bs-badge` (Angular), `BsBadge` (React, Vue)
 * and `mp-badge` (Lit), from the core in `badge.core.ts` and the template in `templates/`.
 */
export default {
  group: 'badge',
  style: { scope: 'badge', bootstrap: ['badge'] },
  components: {
    badge: {
      core: 'badgeCore',
      doc: "Bootstrap's badge: a `.badge` around its content in a `color`, with a visually hidden `unit` that says what a number counts.",
      inputs: {
        type: 'BadgeInputs',
        fields: {
          color: { default: "'primary'", kind: 'string', reflect: true },
          unit: { default: 'null', kind: 'string' },
          decorative: { default: 'false', reflect: true },
        },
      },
    },
  },
} satisfies ComponentGroup;
