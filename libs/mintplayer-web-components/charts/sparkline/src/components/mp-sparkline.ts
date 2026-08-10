import { LitElement, html, svg, nothing, type TemplateResult } from 'lit';
import { linearScale } from '@mintplayer/web-components/charts/core';
import { sparklineStyles } from '../styles';

const W = 100;
const H = 28;
const PAD = 3;

/**
 * `<mp-sparkline>` — axis-less inline trend for table cells (the codecov
 * flags/components-table shape). Deliberately NOT keyboard-interactive: it is
 * a non-interactive graphic (`role="img"`) whose accessible name summarizes
 * the series ("first, last, lowest, highest", locale-formatted). The real
 * numbers belong in the table cell next to it — which is where sparklines live
 * anyway.
 *
 * Naming follows the library contract: host `aria-label` > `input-label` >
 * `summaryFormatter` > the generated summary (a data-derived default).
 *
 * `points: (number | null)[]` is property-only; `null` renders a gap.
 * No-JS tier: none; registers in axe.spec.ts only.
 */
export class MpSparkline extends LitElement {
  static override styles = [sparklineStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'area',
      'show-last-dot',
      'y-min',
      'y-max',
      'locale',
      // Copied onto the in-shadow role=img node — the host is generic.
      'aria-label',
      'input-label',
    ];
  }

  private _points: (number | null)[] = [];
  private _area = false;
  private _showLastDot = true;
  private _yMin: number | undefined;
  private _yMax: number | undefined;
  private _locale: string | undefined;
  private _inputLabel: string | null = null;
  private _summaryFormatter: ((points: (number | null)[]) => string | undefined) | undefined;

  get points(): (number | null)[] {
    return this._points;
  }
  set points(value: (number | null)[]) {
    this._points = Array.isArray(value) ? value : [];
    this.requestUpdate();
  }

  get area(): boolean {
    return this._area;
  }
  set area(value: boolean) {
    this._area = !!value;
    this.requestUpdate();
  }

  get showLastDot(): boolean {
    return this._showLastDot;
  }
  set showLastDot(value: boolean) {
    this._showLastDot = !!value;
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

  get locale(): string | undefined {
    return this._locale;
  }
  set locale(value: string | undefined) {
    this._locale = value || undefined;
    this.requestUpdate();
  }

  get inputLabel(): string | null {
    return this._inputLabel;
  }
  set inputLabel(value: string | null) {
    this._inputLabel = value ?? null;
    this.requestUpdate();
  }

  get summaryFormatter(): ((points: (number | null)[]) => string | undefined) | undefined {
    return this._summaryFormatter;
  }
  set summaryFormatter(value: ((points: (number | null)[]) => string | undefined) | undefined) {
    this._summaryFormatter = value;
    this.requestUpdate();
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'area': this.area = newValue !== null && newValue !== 'false'; break;
      case 'show-last-dot': this.showLastDot = newValue !== 'false' && newValue !== null; break;
      case 'y-min': this.yMin = newValue === null ? undefined : Number(newValue); break;
      case 'y-max': this.yMax = newValue === null ? undefined : Number(newValue); break;
      case 'locale': this.locale = newValue ?? undefined; break;
      case 'aria-label': this.requestUpdate(); break;
      case 'input-label': this.inputLabel = newValue; break;
    }
  }

  private accessibleName(): string {
    const named = this.getAttribute('aria-label') ?? this._inputLabel;
    if (named) return named;
    const custom = this._summaryFormatter?.(this._points);
    if (custom !== undefined) return custom;
    const values = this._points.filter((p): p is number => p !== null);
    if (!values.length) return '';
    const numbers = new Intl.NumberFormat(this._locale || this.closest('[lang]')?.getAttribute('lang') || undefined);
    return [
      numbers.format(values[0]),
      numbers.format(values[values.length - 1]),
      numbers.format(Math.min(...values)),
      numbers.format(Math.max(...values)),
    ].join(', ');
  }

  override render(): TemplateResult {
    const values = this._points.filter((p): p is number => p !== null);
    if (!values.length) return html``;
    const lo = this._yMin ?? Math.min(...values);
    const hi = this._yMax ?? Math.max(...values);
    const x = linearScale([0, Math.max(1, this._points.length - 1)], [PAD, W - PAD]);
    const y = linearScale(lo === hi ? [lo - 1, hi + 1] : [lo, hi], [H - PAD, PAD]);

    // Runs of consecutive non-null points; a null renders as a gap.
    const runs = this._points.reduce<Array<Array<{ px: number; py: number }>>>((acc, p, i) => {
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
    const last = runs[runs.length - 1]?.[runs[runs.length - 1].length - 1];

    return html`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label=${this.accessibleName() || nothing} preserveAspectRatio="none">
      ${this._area ? svg`<path class="fill" d=${fill}></path>` : nothing}
      <path class="line" d=${line}></path>
      ${this._showLastDot && last ? svg`<circle class="dot" cx=${last.px} cy=${last.py} r="3"></circle>` : nothing}
    </svg>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-sparkline')) {
  customElements.define('mp-sparkline', MpSparkline);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-sparkline': MpSparkline;
  }
}
