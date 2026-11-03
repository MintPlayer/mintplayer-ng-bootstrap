import { defineCore } from '@mintplayer/ui-core/component';
import { connectSparkline, type SparklineView } from './sparkline';

/** Wins over the generated "first, last, lowest, highest" name; `undefined` falls back to it. */
export type SparklineSummaryFormatter = (points: (number | null)[]) => string | undefined;

export interface SparklineInputs {
  /** `null` renders a gap. */
  points: (number | null)[] | null;
  /** Fill the area under the line. */
  area: boolean;
  /** Mark the last point. */
  showLastDot: boolean;
  yMin: number | null;
  yMax: number | null;
  /** Number formatting for the generated name. Defaults to the nearest `lang` once live. */
  locale: string | null;
  /** The chart's name, when the consumer's `aria-label` does not give one. */
  inputLabel: string | null;
  summaryFormatter: SparklineSummaryFormatter | null;
}

export interface SparklineState {
  /** The nearest `lang`, read once the sparkline is live. */
  lang: string | null;
}

/**
 * The sparkline's core (#458 M3). Not interactive: it only reads the nearest
 * `lang` on attach, so the generated name is formatted for the page's language.
 */
export const sparklineCore = defineCore<SparklineInputs, SparklineState, { view: SparklineView }>({
  state: () => ({ lang: null }),
  view: ({ inputs, state, label }) => ({
    view: connectSparkline(inputs.points ?? [], {
      area: inputs.area,
      showLastDot: inputs.showLastDot,
      yMin: inputs.yMin ?? undefined,
      yMax: inputs.yMax ?? undefined,
      locale: inputs.locale || state.lang || undefined,
      label: label ?? inputs.inputLabel,
      summaryFormatter: inputs.summaryFormatter ?? undefined,
    }),
  }),
  attach: (api) => {
    const lang = api.host.closest('[lang]')?.getAttribute('lang') ?? null;
    if (lang !== api.state().lang) api.setState({ lang });
  },
});
