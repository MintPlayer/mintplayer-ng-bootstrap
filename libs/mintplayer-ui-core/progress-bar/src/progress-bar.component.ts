import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The progress group's manifest (#458 M5): `bs-progress` / `bs-progress-bar`
 * (Angular), `BsProgress` / `BsProgressBar` (React, Vue) and `mp-progress` /
 * `mp-progress-bar` (Lit).
 */
export default {
  group: 'progress-bar',
  style: { scope: 'progress', bootstrap: ['progress'] },
  components: {
    progress: {
      core: 'progressCore',
      doc: [
        "Bootstrap's progress track around one or more `progress-bar`s. `indeterminate` shows an animated",
        'bar of unknown progress, named by `label`, instead.',
      ].join('\n'),
      inputs: {
        type: 'ProgressInputs',
        fields: {
          height: { default: 'null' },
          indeterminate: { default: 'false', reflect: true },
          label: { default: "'Loading'", kind: 'string' },
        },
      },
    },
    'progress-bar': {
      core: 'progressBarCore',
      doc: 'One bar: a `role="progressbar"` named by `label`, its width the share of `value` between `minimum` and `maximum`.',
      inputs: {
        type: 'ProgressBarInputs',
        fields: {
          minimum: { default: '0' },
          maximum: { default: '100' },
          value: { default: '0' },
          color: { default: "'primary'", kind: 'string' },
          striped: { default: 'false' },
          animated: { default: 'false' },
          label: { default: "'Progress'", kind: 'string' },
          valueText: { default: 'null', kind: 'string' },
        },
      },
    },
  },
} satisfies ComponentGroup;
