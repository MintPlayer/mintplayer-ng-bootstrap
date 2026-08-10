import { LitElement, html, svg, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import {
  linearScale,
  niceDomain,
  niceTicks,
  timeTicks,
  type TrendHoverEventDetail,
  type TrendPoint,
  type TrendPointEventDetail,
  type TrendSeries,
} from '@mintplayer/web-components/charts/core';
import { trendChartStyles } from '../styles';

/** Default series palette (series.color overrides per series). */
const PALETTE = ['#0d6efd', '#21b577', '#fd7e14', '#6f42c1', '#d63384', '#20c997', '#dc3545', '#6c757d'];

const W = 1000;
const H = 562; // 16:9 in logical units
const MARGIN = { top: 20, right: 20, bottom: 48, left: 72 };

interface PlacedPoint {
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

/**
 * `<mp-trend-chart>` — metric-over-time line/area chart (the codecov/Codacy
 * coverage trend shape): multi-series, optional stacking (assumes aligned x
 * samples), optional goal line, locale-aware calendar ticks.
 *
 * `y: null` renders a gap — forward-filling is the consumer's choice.
 * No-JS tier: none; the demo registers in axe.spec.ts only.
 *
 * A11y: the svg is a named `role="group"`; every data point is a focusable
 * `role="button"` circle ("series, date, value") behind ONE tab stop (roving);
 * Left/Right walk points, Up/Down switch series, Home/End jump. The optional
 * `summary` attribute (or `summaryFormatter`) is exposed via aria-describedby
 * inside the same shadow tree (IDREFs never cross a root here).
 *
 * Events: `trend-point-hover`, `trend-point-select` (bubbling + composed).
 */
export class MpTrendChart extends LitElement {
  static override styles = [trendChartStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'area',
      'stacked',
      'y-min',
      'y-max',
      'goal',
      'goal-label',
      'locale',
      'summary',
      'aria-label',
      'input-label',
    ];
  }

  private _series: TrendSeries[] = [];
  private _area = true;
  private _stacked = false;
  private _yMin: number | undefined;
  private _yMax: number | undefined;
  private _goal: number | undefined;
  private _goalLabel: string | undefined;
  private _locale: string | undefined;
  private _summary: string | undefined;
  private _inputLabel: string | null = null;
  private _summaryFormatter: ((series: TrendSeries[]) => string | undefined) | undefined;
  private _tooltipFormatter: ((points: PlacedPoint[]) => string | undefined) | undefined;

  private _placed: PlacedPoint[] = [];
  private _focusedKey: string | null = null;
  private _restoreFocus = false;
  private _hoveredKey: string | null = null;

  get series(): TrendSeries[] {
    return this._series;
  }
  set series(value: TrendSeries[]) {
    this._series = Array.isArray(value) ? value : [];
    this.requestUpdate();
  }

  get area(): boolean {
    return this._area;
  }
  set area(value: boolean) {
    this._area = !!value;
    this.requestUpdate();
  }

  get stacked(): boolean {
    return this._stacked;
  }
  set stacked(value: boolean) {
    this._stacked = !!value;
    this.requestUpdate();
  }

  get yMin(): number | undefined {
    return this._yMin;
  }
  set yMin(value: number | undefined) {
    this._yMin = value === undefined || value === null ? undefined : Number(value);
    this.requestUpdate();
  }

  get yMax(): number | undefined {
    return this._yMax;
  }
  set yMax(value: number | undefined) {
    this._yMax = value === undefined || value === null ? undefined : Number(value);
    this.requestUpdate();
  }

  get goal(): number | undefined {
    return this._goal;
  }
  set goal(value: number | undefined) {
    this._goal = value === undefined || value === null ? undefined : Number(value);
    this.requestUpdate();
  }

  get goalLabel(): string | undefined {
    return this._goalLabel;
  }
  set goalLabel(value: string | undefined) {
    this._goalLabel = value || undefined;
    this.requestUpdate();
  }

  get locale(): string | undefined {
    return this._locale;
  }
  set locale(value: string | undefined) {
    this._locale = value || undefined;
    this.requestUpdate();
  }

  get summary(): string | undefined {
    return this._summary;
  }
  set summary(value: string | undefined) {
    this._summary = value || undefined;
    this.requestUpdate();
  }

  get inputLabel(): string | null {
    return this._inputLabel;
  }
  set inputLabel(value: string | null) {
    this._inputLabel = value ?? null;
    this.requestUpdate();
  }

  get summaryFormatter(): ((series: TrendSeries[]) => string | undefined) | undefined {
    return this._summaryFormatter;
  }
  set summaryFormatter(value: ((series: TrendSeries[]) => string | undefined) | undefined) {
    this._summaryFormatter = value;
    this.requestUpdate();
  }

  get tooltipFormatter(): ((points: PlacedPoint[]) => string | undefined) | undefined {
    return this._tooltipFormatter;
  }
  set tooltipFormatter(value: ((points: PlacedPoint[]) => string | undefined) | undefined) {
    this._tooltipFormatter = value;
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'area': this.area = newValue !== 'false' && newValue !== null; break;
      case 'stacked': this.stacked = newValue !== null && newValue !== 'false'; break;
      case 'y-min': this.yMin = newValue === null ? undefined : Number(newValue); break;
      case 'y-max': this.yMax = newValue === null ? undefined : Number(newValue); break;
      case 'goal': this.goal = newValue === null ? undefined : Number(newValue); break;
      case 'goal-label': this.goalLabel = newValue ?? undefined; break;
      case 'locale': this.locale = newValue ?? undefined; break;
      case 'summary': this.summary = newValue ?? undefined; break;
      case 'aria-label': this.requestUpdate(); break;
      case 'input-label': this._inputLabel = newValue; this.requestUpdate(); break;
    }
  }

  /* ---------- layout ---------- */

  private static toMs(x: number | Date): number {
    return x instanceof Date ? x.getTime() : Number(x);
  }

  private numberFormat(): Intl.NumberFormat {
    return new Intl.NumberFormat(this._locale || this.closest('[lang]')?.getAttribute('lang') || undefined);
  }

  private dateFormat(): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat(this._locale || this.closest('[lang]')?.getAttribute('lang') || undefined, {
      dateStyle: 'medium',
    });
  }

  /** Plot every non-gap point; stacked series plot the running sum per x. */
  private place(): { placed: PlacedPoint[]; xd: [number, number]; yd: [number, number] } {
    const stackSum = new Map<number, number>();
    const placed = this._series.flatMap((s, si) =>
      s.points
        .map((point, pi) => ({ point, pi }))
        .filter((e): e is { point: TrendPoint & { y: number }; pi: number } => e.point.y !== null)
        .map((e) => {
          const xMs = MpTrendChart.toMs(e.point.x);
          const base = this._stacked ? stackSum.get(xMs) ?? 0 : 0;
          const yPlot = base + e.point.y;
          if (this._stacked) stackSum.set(xMs, yPlot);
          return {
            seriesId: s.id,
            seriesLabel: s.label,
            color: s.color ?? PALETTE[si % PALETTE.length],
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
    const xd: [number, number] = xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1];
    const rawLo = Math.min(...(ys.length ? ys : [0]), this._goal ?? Infinity, this._stacked ? 0 : Infinity);
    const rawHi = Math.max(...(ys.length ? ys : [1]), this._goal ?? -Infinity);
    const auto = niceDomain(Math.min(rawLo, rawHi), Math.max(rawLo, rawHi));
    const yd: [number, number] = [this._yMin ?? auto[0], this._yMax ?? auto[1]];
    const x = linearScale(xd, [MARGIN.left, W - MARGIN.right]);
    const y = linearScale(yd, [H - MARGIN.bottom, MARGIN.top]);
    placed.map((p) => {
      p.px = x(p.xMs);
      p.py = y(p.yPlot);
      return p;
    });
    return { placed, xd, yd };
  }

  /**
   * Null points are dropped before placement, so a gap shows up as a jump in
   * pointIndex between neighbours — each contiguous stretch is its own run.
   */
  private static runsOf(points: PlacedPoint[]): PlacedPoint[][] {
    return points.reduce<PlacedPoint[][]>((acc, p) => {
      const last = acc[acc.length - 1];
      if (last?.length && p.pointIndex === last[last.length - 1].pointIndex + 1) {
        return [...acc.slice(0, -1), [...last, p]];
      }
      return [...acc, [p]];
    }, []);
  }

  private linePath(points: PlacedPoint[]): string {
    return MpTrendChart.runsOf(points)
      .map((run) => run.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px} ${p.py}`).join(' '))
      .join(' ');
  }

  private areaPath(points: PlacedPoint[], baselineY: number): string {
    return MpTrendChart.runsOf(points)
      .filter((run) => run.length > 1)
      .map((run) =>
        `M ${run[0].px} ${baselineY} ` +
        run.map((p) => `L ${p.px} ${p.py}`).join(' ') +
        ` L ${run[run.length - 1].px} ${baselineY} Z`)
      .join(' ');
  }

  /* ---------- interaction ---------- */

  private keyOf(p: PlacedPoint): string {
    return `${p.seriesId}\u0000${p.pointIndex}`;
  }

  private pointName(p: PlacedPoint): string {
    const numbers = this.numberFormat();
    const when = typeof p.point.x === 'number' && p.point.x < 10_000_000
      ? numbers.format(p.point.x)
      : this.dateFormat().format(new Date(p.xMs));
    return `${p.seriesLabel}, ${when}, ${p.point.y === null ? '—' : numbers.format(p.point.y)}`;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this._placed.length) return;
    const chart = this.shadowRoot?.querySelector<HTMLElement>('.chart');
    const rect = chart?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const logicalX = ((event.clientX - rect.left) / rect.width) * W;
    const nearest = this._placed.reduce((best, p) =>
      Math.abs(p.px - logicalX) < Math.abs(best.px - logicalX) ? p : best);
    const atX = this._placed.filter((p) => p.xMs === nearest.xMs);

    const tooltip = this.shadowRoot?.querySelector<HTMLElement>('.chart-tooltip');
    if (tooltip) {
      tooltip.textContent = this._tooltipFormatter?.(atX)
        ?? atX.map((p) => this.pointName(p)).join(' · ');
      tooltip.style.left = `${event.clientX - rect.left + 12}px`;
      tooltip.style.top = `${event.clientY - rect.top + 12}px`;
      tooltip.setAttribute('data-visible', '');
    }
    if (this._hoveredKey !== this.keyOf(nearest)) {
      this._hoveredKey = this.keyOf(nearest);
      this.requestUpdate();
      this.emit<TrendHoverEventDetail>('trend-point-hover', { seriesId: nearest.seriesId, point: nearest.point });
    }
  }

  private clearHover(): void {
    this.shadowRoot?.querySelector('.chart-tooltip')?.removeAttribute('data-visible');
    if (this._hoveredKey !== null) {
      this._hoveredKey = null;
      this.requestUpdate();
      this.emit<TrendHoverEventDetail>('trend-point-hover', { seriesId: null, point: null });
    }
  }

  private onClick(event: MouseEvent): void {
    const key = (event.composedPath()[0] as Element | undefined)
      ?.closest?.('[data-key]')
      ?.getAttribute('data-key');
    const p = this._placed.find((c) => this.keyOf(c) === key);
    if (p) this.emit<TrendPointEventDetail>('trend-point-select', { seriesId: p.seriesId, point: p.point });
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = (event.composedPath()[0] as Element | undefined)
      ?.closest?.('[data-key]')
      ?.getAttribute('data-key');
    const current = this._placed.find((c) => this.keyOf(c) === key);
    if (!current) return;
    const sameSeries = this._placed
      .filter((p) => p.seriesId === current.seriesId)
      .sort((a, b) => a.xMs - b.xMs);
    const at = sameSeries.findIndex((p) => this.keyOf(p) === key);
    const seriesIds = [...new Set(this._placed.map((p) => p.seriesId))];
    const sAt = seriesIds.indexOf(current.seriesId);

    const move = (target: PlacedPoint | undefined): void => {
      if (!target) return;
      this._focusedKey = this.keyOf(target);
      this._restoreFocus = true;
      this.requestUpdate();
    };

    switch (event.key) {
      case 'ArrowRight': move(sameSeries[at + 1]); break;
      case 'ArrowLeft': move(sameSeries[at - 1]); break;
      case 'Home': move(sameSeries[0]); break;
      case 'End': move(sameSeries[sameSeries.length - 1]); break;
      case 'ArrowUp':
      case 'ArrowDown': {
        const nextSeries = seriesIds[(sAt + (event.key === 'ArrowDown' ? 1 : seriesIds.length - 1)) % seriesIds.length];
        const candidates = this._placed.filter((p) => p.seriesId === nextSeries);
        if (!candidates.length) return;
        move(candidates.reduce((best, p) =>
          Math.abs(p.xMs - current.xMs) < Math.abs(best.xMs - current.xMs) ? p : best));
        break;
      }
      case 'Enter':
      case ' ':
        this.emit<TrendPointEventDetail>('trend-point-select', { seriesId: current.seriesId, point: current.point });
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  private emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true }));
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (this._restoreFocus && this._focusedKey) {
      this._restoreFocus = false;
      const escaped = this._focusedKey.replace(/["\\]/g, '\\$&');
      this.shadowRoot
        ?.querySelector<SVGElement>(`[data-key="${escaped}"]`)
        ?.focus({ preventScroll: true });
    }
  }

  /* ---------- render ---------- */

  private groupLabel(): string | null {
    return this.getAttribute('aria-label') ?? this._inputLabel;
  }

  override render(): TemplateResult {
    const { placed, xd, yd } = this.place();
    this._placed = placed;
    const stillThere = this._focusedKey && placed.some((p) => this.keyOf(p) === this._focusedKey);
    if (!stillThere) this._focusedKey = placed.length ? this.keyOf(placed[0]) : null;

    const y = linearScale(yd, [H - MARGIN.bottom, MARGIN.top]);
    const x = linearScale(xd, [MARGIN.left, W - MARGIN.right]);
    const numbers = this.numberFormat();
    const yTicks = niceTicks(yd[0], yd[1]).filter((t) => t >= yd[0] && t <= yd[1]);
    const xTicks = timeTicks(xd[0], xd[1], 6, this._locale);
    const summary = this._summaryFormatter?.(this._series) ?? this._summary;
    const label = this.groupLabel();
    const baselineY = y(Math.max(yd[0], Math.min(yd[1], this._stacked ? 0 : yd[0])));
    const bySeries = this._series.map((s, si) => ({
      series: s,
      color: s.color ?? PALETTE[si % PALETTE.length],
      points: placed.filter((p) => p.seriesId === s.id).sort((a, b) => a.xMs - b.xMs),
    }));
    const hovered = placed.find((p) => this.keyOf(p) === this._hoveredKey);

    return html`<div
      class="chart"
      @click=${this.onClick}
      @keydown=${this.onKeyDown}
      @pointermove=${this.onPointerMove}
      @pointerleave=${this.clearHover}
    >
      <svg
        viewBox="0 0 ${W} ${H}"
        role="group"
        aria-label=${label ?? nothing}
        aria-describedby=${summary ? 'trend-summary' : nothing}
      >
        <g class="grid" aria-hidden="true">
          ${repeat(yTicks, (t) => `y-${t}`, (t) => svg`<line x1=${MARGIN.left} x2=${W - MARGIN.right} y1=${y(t)} y2=${y(t)}></line>`)}
        </g>
        <g class="axis" aria-hidden="true">
          ${repeat(yTicks, (t) => `yl-${t}`, (t) => svg`<text class="y-label" x=${MARGIN.left - 10} y=${y(t)}>${numbers.format(t)}</text>`)}
          ${repeat(xTicks, (t) => `xl-${t.time}`, (t) => svg`<text class="x-label" x=${x(t.time)} y=${H - MARGIN.bottom + 12}>${t.label}</text>`)}
        </g>
        ${this._goal !== undefined
          ? svg`<g aria-hidden="true">
              <line class="goal-line" x1=${MARGIN.left} x2=${W - MARGIN.right} y1=${y(this._goal)} y2=${y(this._goal)}></line>
              ${this._goalLabel ? svg`<text class="goal-label" x=${W - MARGIN.right} y=${y(this._goal) - 8}>${this._goalLabel}</text>` : nothing}
            </g>`
          : nothing}
        ${hovered
          ? svg`<line class="crosshair" x1=${hovered.px} x2=${hovered.px} y1=${MARGIN.top} y2=${H - MARGIN.bottom}></line>`
          : nothing}
        ${repeat(bySeries, (e) => e.series.id, (e) => svg`<g aria-hidden="true">
          ${this._area ? svg`<path class="series-area" fill=${e.color} d=${this.areaPath(e.points, baselineY)}></path>` : nothing}
          <path class="series-line" stroke=${e.color} d=${this.linePath(e.points)}></path>
        </g>`)}
        ${repeat(placed, (p) => this.keyOf(p), (p) => svg`<circle
          class="point"
          data-key=${this.keyOf(p)}
          ?data-hovered=${this.keyOf(p) === this._hoveredKey}
          cx=${p.px}
          cy=${p.py}
          r="9"
          color=${p.color}
          role="button"
          tabindex=${this.keyOf(p) === this._focusedKey ? '0' : '-1'}
          aria-label=${this.pointName(p)}
        ></circle>`)}
      </svg>
      ${summary ? html`<div id="trend-summary" class="visually-hidden">${summary}</div>` : nothing}
      <div class="chart-tooltip" aria-hidden="true"></div>
    </div>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-trend-chart')) {
  customElements.define('mp-trend-chart', MpTrendChart);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-trend-chart': MpTrendChart;
  }
}
