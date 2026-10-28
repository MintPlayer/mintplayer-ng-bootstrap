import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import type { TrendHoverEventDetail, TrendPointEventDetail, TrendSeries } from '@mintplayer/ui-core/charts/core';
import {
  TREND_H,
  TREND_W,
  connectTrendChart,
  layoutTrend,
  pointKey,
  trendPointName,
  type PlacedPoint,
  type TrendChartView,
  type TrendTooltip,
} from './trend';

/**
 * The trend chart's core (PRD #437 D10): what the generated Angular, React, Vue
 * and Lit components host. `trend.component.ts` is the manifest and
 * `templates/trend-chart.view.vue` the markup.
 *
 * Pointer and keyboard are delegated on the root. The points are keyed, so the
 * circle a key names survives a re-render: a key press focuses it directly and
 * the state change moves the tab stop after it.
 */
export interface TrendChartInputs {
  series: readonly TrendSeries[] | null;
  /** Fill the area under each line. */
  area: boolean;
  /** Stack the series (assumes aligned x samples). */
  stacked: boolean;
  yMin?: number | null;
  yMax?: number | null;
  goal?: number | null;
  goalLabel?: string | null;
  /** Number and date formatting; the nearest `lang` when unset. */
  locale?: string | null;
  /** A description of the trend, behind `aria-describedby`. */
  summary?: string | null;
  /** The chart's accessible name; an `aria-label` on the component wins. */
  inputLabel?: string | null;
  /** Builds the summary from the series; wins over `summary`. */
  summaryFormatter?: TrendSummaryFormatter | null;
  /** Builds the hover tooltip from the points in the hovered column. */
  tooltipFormatter?: TrendTooltipFormatter | null;
}

export type TrendSummaryFormatter = (series: TrendSeries[]) => string | undefined;
export type TrendTooltipFormatter = (points: PlacedPoint[]) => string | undefined;

export interface TrendChartState {
  focusedKey: string | null;
  hoveredKey: string | null;
  tooltip: TrendTooltip | null;
  /** The nearest `lang`, read once the chart is live. */
  lang: string | null;
}

export interface TrendChartEvents {
  pointHover: TrendHoverEventDetail;
  pointSelect: TrendPointEventDetail;
}

type Api = CoreApi<TrendChartInputs, TrendChartState, TrendChartEvents>;

const localeOf = (inputs: Readonly<TrendChartInputs>, state: Readonly<TrendChartState>): string | undefined =>
  inputs.locale || state.lang || undefined;

const placedOf = (api: Api): PlacedPoint[] => layoutTrend(api.inputs()).placed;

const keyFrom = (ev: Event): string | null =>
  ((ev.target as Element | null)?.closest?.('[data-key]') as SVGElement | null)?.dataset['key'] ?? null;

/**
 * Found by iteration, not by an attribute selector: the key joins two
 * consumer-supplied strings, and comparing dataset values sidesteps escaping.
 */
const pointElement = (api: Api, key: string): SVGElement | undefined =>
  [...api.host.querySelectorAll<SVGElement>('.point')].find((node) => node.dataset['key'] === key);

/** The point a key press moves to, or undefined when the key is not a move. */
function moveTarget(placed: PlacedPoint[], current: PlacedPoint, key: string): PlacedPoint | undefined {
  const sameSeries = placed.filter((p) => p.seriesId === current.seriesId).sort((a, b) => a.xMs - b.xMs);
  const at = sameSeries.findIndex((p) => pointKey(p) === pointKey(current));
  switch (key) {
    case 'ArrowRight':
      return sameSeries[at + 1];
    case 'ArrowLeft':
      return sameSeries[at - 1];
    case 'Home':
      return sameSeries[0];
    case 'End':
      return sameSeries[sameSeries.length - 1];
    case 'ArrowUp':
    case 'ArrowDown': {
      const ids = [...new Set(placed.map((p) => p.seriesId))];
      const next = ids[(ids.indexOf(current.seriesId) + (key === 'ArrowDown' ? 1 : ids.length - 1)) % ids.length];
      const candidates = placed.filter((p) => p.seriesId === next);
      return candidates.length
        ? candidates.reduce((best, p) => (Math.abs(p.xMs - current.xMs) < Math.abs(best.xMs - current.xMs) ? p : best))
        : undefined;
    }
    default:
      return undefined;
  }
}

const MOVES = new Set(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

export const trendChartCore = defineCore<TrendChartInputs, TrendChartState, { view: TrendChartView }, TrendChartEvents>({
  state: () => ({ focusedKey: null, hoveredKey: null, tooltip: null, lang: null }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectTrendChart({
      ...inputs,
      area: inputs.area !== false,
      locale: localeOf(inputs, state),
      label: label ?? inputs.inputLabel ?? null,
      id,
      live: hydrated,
      focusedKey: state.focusedKey,
      hoveredKey: state.hoveredKey,
      tooltip: state.tooltip,
    }),
  }),
  attach: (api) => {
    const root = api.host;
    const lang = root.closest('[lang]')?.getAttribute('lang') ?? null;
    if (lang !== api.state().lang) api.setState({ lang });

    const select = (p: PlacedPoint) => api.emit('pointSelect', { seriesId: p.seriesId, point: p.point });

    const onClick = (ev: MouseEvent) => {
      const key = keyFrom(ev);
      const p = key === null ? undefined : placedOf(api).find((c) => pointKey(c) === key);
      if (p) select(p);
    };

    const onKeydown = (ev: KeyboardEvent) => {
      const key = keyFrom(ev);
      const placed = placedOf(api);
      const current = placed.find((c) => pointKey(c) === key);
      if (!current) return;
      if (MOVES.has(ev.key)) {
        const target = moveTarget(placed, current, ev.key);
        if (target) {
          pointElement(api, pointKey(target))?.focus({ preventScroll: true });
          api.setState({ focusedKey: pointKey(target) });
        }
      } else if (ev.key === 'Enter' || ev.key === ' ') {
        select(current);
      } else {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
    };

    const onPointerMove = (ev: PointerEvent) => {
      const placed = placedOf(api);
      const rect = root.querySelector('svg')?.getBoundingClientRect();
      if (!placed.length || !rect || rect.width === 0) return;
      const lx = ((ev.clientX - rect.left) / rect.width) * TREND_W;
      const ly = ((ev.clientY - rect.top) / rect.height) * TREND_H;
      // Two steps, because they answer different questions. The COLUMN is chosen
      // on x alone: the crosshair and the tooltip describe one moment in time
      // across every series. The highlighted POINT is then the one nearest the
      // cursor within that column. A Euclidean search over all points would let
      // a purely vertical move land in a neighbouring column.
      const column = placed.reduce((best, p) => (Math.abs(p.px - lx) < Math.abs(best.px - lx) ? p : best));
      const atX = placed.filter((p) => p.xMs === column.xMs);
      const nearest = atX.reduce((best, p) => (Math.abs(p.py - ly) < Math.abs(best.py - ly) ? p : best));
      const locale = localeOf(api.inputs(), api.state());
      const text = api.inputs().tooltipFormatter?.(atX) ?? atX.map((p) => trendPointName(p, locale)).join(' · ');
      const box = root.getBoundingClientRect();
      const changed = api.state().hoveredKey !== pointKey(nearest);
      api.setState({
        hoveredKey: pointKey(nearest),
        tooltip: { text, left: ev.clientX - box.left + 12, top: ev.clientY - box.top + 12 },
      });
      if (changed) api.emit('pointHover', { seriesId: nearest.seriesId, point: nearest.point });
    };

    const onPointerLeave = () => {
      const wasHovering = api.state().hoveredKey !== null;
      api.setState({ hoveredKey: null, tooltip: null });
      if (wasHovering) api.emit('pointHover', { seriesId: null, point: null });
    };

    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerleave', onPointerLeave);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeave);
    };
  },
});
