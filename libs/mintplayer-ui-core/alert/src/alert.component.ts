import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The alert's manifest (#458 M5): `bs-alert` (Angular), `BsAlert` (React, Vue)
 * and `mp-alert` (Lit). `dismissible` replaces the former `bs-alert-close`.
 */
export default {
  group: 'alert',
  style: { scope: 'alert', bootstrap: ['alert', 'close'] },
  components: {
    alert: {
      core: 'alertCore',
      doc: [
        "Bootstrap's contextual alert. `visible` is two-way; `dismissible` adds a close button named by",
        '`closeLabel` that hides it and keeps focus on the page. `announce` opts in to `role="alert"`.',
      ].join('\n'),
      inputs: {
        type: 'AlertInputs',
        fields: {
          color: { default: "'primary'", kind: 'string' },
          announce: { default: 'false' },
          dismissible: { default: 'false' },
          closeLabel: { default: "'Close'", kind: 'string' },
          visible: { default: 'true', model: true },
        },
      },
      outputs: {
        visibleChange: { type: 'boolean', doc: 'The user dismissed the alert.' },
      },
    },
  },
} satisfies ComponentGroup;
