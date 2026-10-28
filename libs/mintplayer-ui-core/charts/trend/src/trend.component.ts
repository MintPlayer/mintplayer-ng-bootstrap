import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The trend chart's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-trend-chart` (Angular), `BsTrendChart` (React, Vue) and
 * `mp-trend-chart` (Lit) from it, the core in `trend.core.ts` and the template
 * in `templates/`.
 */
export default {
  group: 'charts/trend',
  styles: [{ scope: 'TREND_CHART_SCOPE', sheet: 'trendChartScopedStyles' }],
  components: {
    'trend-chart': {
      core: 'trendChartCore',
      doc: [
        'A metric over time as one SVG: multi-series, optional stacking, a goal line and locale-aware ticks.',
        '',
        'The server renders the finished chart. Once live, the points are a roving set of buttons:',
        'arrows move within a series, up/down switch series, Enter/Space select.',
      ].join('\n'),
      inputs: {
        type: 'TrendChartInputs',
        fields: {
          series: { default: 'null', kind: false },
          area: { default: 'true', kind: 'boolean' },
          stacked: { default: 'false', kind: 'boolean' },
          yMin: { default: 'null', kind: 'number' },
          yMax: { default: 'null', kind: 'number' },
          goal: { default: 'null', kind: 'number' },
          goalLabel: { default: 'null', kind: 'string' },
          locale: { default: 'null', kind: 'string' },
          summary: { default: 'null', kind: 'string' },
          inputLabel: { default: 'null', kind: 'string' },
          summaryFormatter: { default: 'null', kind: false },
          tooltipFormatter: { default: 'null', kind: false },
        },
      },
      outputs: {
        pointHover: { type: 'TrendHoverEventDetail', doc: 'The hovered point changed (both fields null when the pointer leaves).' },
        pointSelect: { type: 'TrendPointEventDetail', doc: 'A point was clicked or activated with Enter/Space.' },
      },
    },
  },
} satisfies ComponentGroup;
