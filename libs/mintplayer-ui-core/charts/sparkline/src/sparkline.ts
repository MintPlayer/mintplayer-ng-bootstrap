import { linearScale } from '@mintplayer/ui-core/charts/core';

/**
 * The sparkline (#437): an axis-less inline trend for table cells, as one
 * viewBox SVG. Deliberately NOT keyboard-interactive: a non-interactive
 * graphic (`role="img"`) whose accessible name summarizes the series ("first,
 * last, lowest, highest", locale-formatted). The real numbers belong in the
 * table cell next to it. Every front renders the same `<svg>` from these bags,
 * so the server HTML is the finished chart.
 */
export type SparklineBag = Record<string, string | null>;

export const SPARKLINE_SCOPE = 'sparkline';

const W = 100;
const H = 28;
const PAD = 3;

export type SparklinePoints = readonly (number | null)[];

export interface SparklineOptions {
  /** Fill the area under the line. Default false. */
  readonly area?: boolean;
  /** Mark the last point. Default true. */
  readonly showLastDot?: boolean;
  readonly yMin?: number;
  readonly yMax?: number;
  /** Number formatting for the generated name; the front passes the nearest `lang` when unset. */
  readonly locale?: string;
  /** Wins over `summaryFormatter` and the generated summary. */
  readonly label?: string | null;
  readonly summaryFormatter?: (points: (number | null)[]) => string | undefined;
}

export interface SparklineView {
  /** The sized box (`.sparkline`), rendered even when there is nothing to draw. */
  readonly root: SparklineBag;
  /** `null` when there is no point to draw. */
  readonly svg: SparklineBag | null;
  /** `null` when there is no area to fill. */
  readonly fill: SparklineBag | null;
  readonly line: SparklineBag;
  /** `null` when the dot is off. */
  readonly dot: SparklineBag | null;
}

const scope = { 'data-mps': SPARKLINE_SCOPE };

/** Accessible name: label > formatter > "first, last, lowest, highest". */
export function sparklineName(points: SparklinePoints, options: SparklineOptions = {}): string {
  if (options.label) return options.label;
  const custom = options.summaryFormatter?.([...points]);
  if (custom !== undefined) return custom;
  const values = points.filter((p): p is number => p !== null);
  if (!values.length) return '';
  const numbers = new Intl.NumberFormat(options.locale || undefined);
  return [values[0], values[values.length - 1], Math.min(...values), Math.max(...values)]
    .map((value) => numbers.format(value))
    .join(', ');
}

const root: SparklineBag = { ...scope, class: 'sparkline' };

/** The box, plus the chart unless there is no point to draw. */
export function connectSparkline(points: SparklinePoints, options: SparklineOptions = {}): SparklineView {
  const values = points.filter((p): p is number => p !== null);
  if (!values.length) return { root, svg: null, fill: null, line: { ...scope, class: 'line' }, dot: null };
  const lo = options.yMin ?? Math.min(...values);
  const hi = options.yMax ?? Math.max(...values);
  const x = linearScale([0, Math.max(1, points.length - 1)], [PAD, W - PAD]);
  const y = linearScale(lo === hi ? [lo - 1, hi + 1] : [lo, hi], [H - PAD, PAD]);

  // Runs of consecutive non-null points; a null renders as a gap.
  const runs = points.reduce<Array<Array<{ px: number; py: number }>>>((acc, p, i) => {
    if (p === null) return [...acc, []];
    const last = acc[acc.length - 1] ?? [];
    return [...acc.slice(0, -1), [...last, { px: x(i), py: y(p) }]];
  }, [[]]).filter((run) => run.length > 0);

  const line = runs
    .map((run) => run.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px} ${p.py}`).join(' '))
    .join(' ');
  const fill = runs
    .filter((run) => run.length > 1)
    .map((run) =>
      `M ${run[0].px} ${H - PAD} ` +
      run.map((p) => `L ${p.px} ${p.py}`).join(' ') +
      ` L ${run[run.length - 1].px} ${H - PAD} Z`)
    .join(' ');
  const lastRun = runs[runs.length - 1];
  const last = lastRun?.[lastRun.length - 1];

  return {
    root,
    svg: {
      ...scope,
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: 'none',
      role: 'img',
      'aria-label': sparklineName(points, options) || null,
    },
    fill: options.area && fill ? { ...scope, class: 'fill', d: fill } : null,
    line: { ...scope, class: 'line', d: line },
    dot: (options.showLastDot ?? true) && last
      ? { ...scope, class: 'dot', cx: String(last.px), cy: String(last.py), r: '3' }
      : null,
  };
}
