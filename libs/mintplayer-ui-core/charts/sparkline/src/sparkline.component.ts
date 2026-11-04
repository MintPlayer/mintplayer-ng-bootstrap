import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The sparkline's manifest (#458 M3): `@mintplayer/nx-component-compiler`
 * generates `bs-sparkline` (Angular), `BsSparkline` (React, Vue) and
 * `mp-sparkline` (Lit) from it, the core in `sparkline.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'charts/sparkline',
  style: { scope: 'sparkline' },
  components: {
    sparkline: {
      core: 'sparklineCore',
      doc: [
        'An axis-less inline trend for table cells, as one SVG. Not interactive: a `role=img` graphic',
        'named by `aria-label`, `inputLabel`, `summaryFormatter` or the generated "first, last, lowest,',
        'highest" (formatted for the nearest `lang`). The real numbers belong in the cell next to it.',
        '`null` points render a gap.',
      ].join('\n'),
      inputs: {
        type: 'SparklineInputs',
        fields: {
          points: { default: 'null', kind: false },
          area: { default: 'false', kind: 'boolean' },
          showLastDot: { default: 'true', kind: 'boolean' },
          yMin: { default: 'null', kind: 'number' },
          yMax: { default: 'null', kind: 'number' },
          locale: { default: 'null', kind: 'string' },
          inputLabel: { default: 'null', kind: 'string' },
          summaryFormatter: { default: 'null', kind: false },
        },
      },
    },
  },
} satisfies ComponentGroup;
