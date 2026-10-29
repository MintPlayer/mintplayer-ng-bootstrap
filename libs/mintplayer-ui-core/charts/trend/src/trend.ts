import type { CoreBag } from '@mintplayer/ui-core/component';
import { linearScale, niceDomain, niceTicks, timeTicks, type TrendPoint, type TrendSeries } from '@mintplayer/ui-core/charts/core';
import { hydratedAttr } from '@mintplayer/ui-core/store';

/**
 * The trend chart (#437): a metric over time, as one viewBox SVG. Multi-series,
 * optional stacking (assumes aligned x samples), an optional goal line and
 * locale-aware calendar ticks. `y: null` renders a gap.
 *
 * Every front renders the same `<svg>` from these bags, so the server HTML is
 * the finished chart. The points are a roving set of buttons once the chart is
 * live; before that they are named images, because a button that cannot act
 * must not take focus.
 */
export const TREND_CHART_SCOPE = 'trend-chart';

export type TrendBag = CoreBag;

/** Default series palette (series.color overrides per series). */
export const TREND_PALETTE = ['#0d6efd', '#21b577', '#fd7e14', '#6f42c1', '#d63384', '#20c997', '#dc3545', '#6c757d'];

/** The viewBox, in logical units (16:9). */
export const TREND_W = 1000;
export const TREND_H = 562;
const MARGIN = { top: 20, right: 20, bottom: 48, left: 72 };

export interface PlacedPoint {
  seriesId: string;
  seriesLabel: string;
  color: string;
  point: TrendPoint;
  xMs: number;
  /** Plotted y (stacked charts plot the running sum). */
  yPlot: number;
  px: number;
  py: number;
  seriesIndex: number;
  pointIndex: number;
}

export interface TrendLayoutOptions {
  readonly series: readonly TrendSeries[] | null | undefined;
  readonly stacked?: boolean;
  readonly yMin?: number | null;
  readonly yMax?: number | null;
  readonly goal?: number | null;
}

export interface TrendLayout {
  /** Every drawn point, in series then source order. */
  readonly placed: PlacedPoint[];
  readonly xd: [number, number];
  readonly yd: [number, number];
}

const toMs = (x: number | Date): number => (x instanceof Date ? x.getTime() : Number(x));
const present = (v: number | null | undefined): v is number => v !== null && v !== undefined && !Number.isNaN(v);

/** Plot every non-gap point; stacked series plot the running sum per x. */
export function layoutTrend(options: TrendLayoutOptions): TrendLayout {
  const stackSum = new Map<number, number>();
  const placed: PlacedPoint[] = (options.series ?? []).flatMap((s, si) =>
    s.points
      .map((point, pi) => ({ point, pi }))
      .filter((e): e is { point: TrendPoint & { y: number }; pi: number } => e.point.y !== null)
      .map((e) => {
        const xMs = toMs(e.point.x);
        const base = options.stacked ? (stackSum.get(xMs) ?? 0) : 0;
        const yPlot = base + e.point.y;
        if (options.stacked) stackSum.set(xMs, yPlot);
        return {
          seriesId: s.id,
          seriesLabel: s.label,
          color: s.color ?? TREND_PALETTE[si % TREND_PALETTE.length],
          point: e.point,
          xMs,
          yPlot,
          px: 0,
          py: 0,
          seriesIndex: si,
          pointIndex: e.pi,
        };
      }),
  );
  const xs = placed.map((p) => p.xMs);
  const ys = placed.map((p) => p.yPlot);
  const goal = present(options.goal) ? options.goal : undefined;
  const xd: [number, number] = xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1];
  const rawLo = Math.min(...(ys.length ? ys : [0]), goal ?? Infinity, options.stacked ? 0 : Infinity);
  const rawHi = Math.max(...(ys.length ? ys : [1]), goal ?? -Infinity);
  const auto = niceDomain(Math.min(rawLo, rawHi), Math.max(rawLo, rawHi));
  const yd: [number, number] = [present(options.yMin) ? options.yMin : auto[0], present(options.yMax) ? options.yMax : auto[1]];
  const x = linearScale(xd, [MARGIN.left, TREND_W - MARGIN.right]);
  const y = linearScale(yd, [TREND_H - MARGIN.bottom, MARGIN.top]);
  return { placed: placed.map((p) => ({ ...p, px: x(p.xMs), py: y(p.yPlot) })), xd, yd };
}

/**
 * The key of a point: source index, then series id. The all-digit index ends at
 * the first colon, so any id is unambiguous. Never a control character: the key
 * is server-rendered into data-key, the HTML parser rewrites NUL to U+FFFD, and
 * React's hydration does not patch attributes, so the client never matched it.
 */
export const pointKey = (p: PlacedPoint): string => `${p.pointIndex}:${p.seriesId}`;

/**
 * Null points are dropped before placement, so a gap shows up as a jump in
 * pointIndex between neighbours: each contiguous stretch is its own run.
 */
function runsOf(points: PlacedPoint[]): PlacedPoint[][] {
  return points.reduce<PlacedPoint[][]>((acc, p) => {
    const last = acc[acc.length - 1];
    if (last?.length && p.pointIndex === last[last.length - 1].pointIndex + 1) return [...acc.slice(0, -1), [...last, p]];
    return [...acc, [p]];
  }, []);
}

const linePath = (points: PlacedPoint[]): string =>
  runsOf(points)
    .map((run) => run.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px} ${p.py}`).join(' '))
    .join(' ');

const areaPath = (points: PlacedPoint[], baselineY: number): string =>
  runsOf(points)
    .filter((run) => run.length > 1)
    .map((run) => `M ${run[0].px} ${baselineY} ` + run.map((p) => `L ${p.px} ${p.py}`).join(' ') + ` L ${run[run.length - 1].px} ${baselineY} Z`)
    .join(' ');

/** "series, date, value", locale-formatted: a point's accessible name and default tooltip line. */
export function trendPointName(p: PlacedPoint, locale?: string): string {
  const numbers = new Intl.NumberFormat(locale || undefined);
  const when =
    typeof p.point.x === 'number' && p.point.x < 10_000_000
      ? numbers.format(p.point.x)
      : new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(new Date(p.xMs));
  return `${p.seriesLabel}, ${when}, ${p.point.y === null ? '—' : numbers.format(p.point.y)}`;
}

/** The hover tooltip: where it sits (px, relative to the chart box) and what it says. */
export interface TrendTooltip {
  readonly text: string;
  readonly left: number;
  readonly top: number;
}

export interface TrendChartOptions extends TrendLayoutOptions {
  readonly area?: boolean;
  readonly goalLabel?: string | null;
  /** Number and date formatting; the core passes the nearest `lang` once live. */
  readonly locale?: string;
  /** Text behind `aria-describedby`; a `summaryFormatter` result wins. */
  readonly summary?: string | null;
  readonly summaryFormatter?: ((series: TrendSeries[]) => string | undefined) | null;
  /** Accessible name of the chart. */
  readonly label?: string | null;
  /** Deterministic id the summary node is derived from. */
  readonly id: string;
  /** Points are buttons with a roving tab stop only once the chart is live. */
  readonly live: boolean;
  /** Key of the point holding the tab stop; the first point when null or gone. */
  readonly focusedKey: string | null;
  readonly hoveredKey: string | null;
  readonly tooltip: TrendTooltip | null;
}

export interface TrendTickView {
  key: string;
  line: TrendBag;
  label: TrendBag;
  text: string;
}

export interface TrendSeriesView {
  key: string;
  group: TrendBag;
  area: TrendBag | null;
  line: TrendBag;
}

export interface TrendPointView {
  key: string;
  bag: TrendBag;
}

export interface TrendChartView {
  root: TrendBag;
  svg: TrendBag;
  grid: TrendBag;
  axis: TrendBag;
  yTicks: TrendTickView[];
  xTicks: TrendTickView[];
  goal: { group: TrendBag; line: TrendBag; label: TrendBag | null; text: string } | null;
  crosshair: TrendBag | null;
  series: TrendSeriesView[];
  points: TrendPointView[];
  summary: { bag: TrendBag; text: string } | null;
  tooltip: { bag: TrendBag; style: Record<string, string>; text: string };
}

export function connectTrendChart(options: TrendChartOptions): TrendChartView {
  const { placed, xd, yd } = layoutTrend(options);
  const y = linearScale(yd, [TREND_H - MARGIN.bottom, MARGIN.top]);
  const x = linearScale(xd, [MARGIN.left, TREND_W - MARGIN.right]);
  const numbers = new Intl.NumberFormat(options.locale || undefined);
  const yTicks = niceTicks(yd[0], yd[1]).filter((t) => t >= yd[0] && t <= yd[1]);
  const xTicks = timeTicks(xd[0], xd[1], 6, options.locale);
  const summary = options.summaryFormatter?.([...(options.series ?? [])]) ?? options.summary ?? null;
  const summaryId = `${options.id}-summary`;
  const baselineY = y(Math.max(yd[0], Math.min(yd[1], options.stacked ? 0 : yd[0])));
  const goal = present(options.goal) ? options.goal : null;
  const keys = placed.map(pointKey);
  const focused = options.focusedKey !== null && keys.includes(options.focusedKey) ? options.focusedKey : (keys[0] ?? null);
  const hovered = placed.find((p) => pointKey(p) === options.hoveredKey);

  return {
    root: { class: 'trend-chart', ...hydratedAttr(options.live) },
    svg: {
      viewBox: `0 0 ${TREND_W} ${TREND_H}`,
      role: 'group',
      'aria-label': options.label ?? null,
      'aria-describedby': summary ? summaryId : null,
    },
    grid: { class: 'grid', 'aria-hidden': 'true' },
    axis: { class: 'axis', 'aria-hidden': 'true' },
    yTicks: yTicks.map((t) => ({
      key: `y-${t}`,
      line: { x1: MARGIN.left, x2: TREND_W - MARGIN.right, y1: y(t), y2: y(t) },
      label: { class: 'y-label', x: MARGIN.left - 10, y: y(t) },
      text: numbers.format(t),
    })),
    xTicks: xTicks.map((t) => ({
      key: `x-${t.time}`,
      line: { x1: x(t.time), x2: x(t.time), y1: MARGIN.top, y2: TREND_H - MARGIN.bottom },
      label: { class: 'x-label', x: x(t.time), y: TREND_H - MARGIN.bottom + 12 },
      text: t.label,
    })),
    goal:
      goal === null
        ? null
        : {
            group: { 'aria-hidden': 'true' },
            line: { class: 'goal-line', x1: MARGIN.left, x2: TREND_W - MARGIN.right, y1: y(goal), y2: y(goal) },
            label: options.goalLabel ? { class: 'goal-label', x: TREND_W - MARGIN.right, y: y(goal) - 8 } : null,
            text: options.goalLabel ?? '',
          },
    crosshair: hovered ? { class: 'crosshair', x1: hovered.px, x2: hovered.px, y1: MARGIN.top, y2: TREND_H - MARGIN.bottom } : null,
    series: (options.series ?? []).map((s, si) => {
      const color = s.color ?? TREND_PALETTE[si % TREND_PALETTE.length];
      const points = placed.filter((p) => p.seriesId === s.id).sort((a, b) => a.xMs - b.xMs);
      return {
        key: s.id,
        group: { 'aria-hidden': 'true' },
        area: options.area === false ? null : { class: 'series-area', fill: color, d: areaPath(points, baselineY) },
        line: { class: 'series-line', stroke: color, d: linePath(points) },
      };
    }),
    points: placed.map((p) => {
      const key = pointKey(p);
      return {
        key,
        bag: {
          class: 'point',
          'data-key': key,
          'data-hovered': key === options.hoveredKey ? '' : null,
          cx: p.px,
          cy: p.py,
          r: 9,
          color: p.color,
          role: options.live ? 'button' : 'img',
          tabindex: options.live ? (key === focused ? 0 : -1) : null,
          'aria-label': trendPointName(p, options.locale),
        },
      };
    }),
    summary: summary ? { bag: { id: summaryId, class: 'visually-hidden' }, text: summary } : null,
    tooltip: {
      bag: { class: 'chart-tooltip', 'aria-hidden': 'true', 'data-visible': options.tooltip ? '' : null },
      style: options.tooltip ? { left: `${options.tooltip.left}px`, top: `${options.tooltip.top}px` } : {},
      text: options.tooltip?.text ?? '',
    },
  };
}
