import { LitElement, html, svg, nothing, type TemplateResult } from 'lit';
import { booleanAttribute, optionalNumberAttribute } from '@mintplayer/ui-core/charts/core';
import { connectSparkline } from '@mintplayer/ui-core/charts/sparkline';
import { props } from '@mintplayer/web-components/machine';
import { sparklineStyles } from '../styles';

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
      case 'area': this.area = booleanAttribute(newValue, false); break;
      case 'show-last-dot': this.showLastDot = booleanAttribute(newValue, true); break;
      case 'y-min': this.yMin = optionalNumberAttribute(newValue); break;
      case 'y-max': this.yMax = optionalNumberAttribute(newValue); break;
      case 'locale': this.locale = newValue ?? undefined; break;
      case 'aria-label': this.requestUpdate(); break;
      case 'input-label': this.inputLabel = newValue; break;
    }
  }

  override render(): TemplateResult {
    // The geometry and the name come from the shared core (#437); this shadow
    // root keeps its own sheet, so the bags' scope marker is inert here.
    const view = connectSparkline(this._points, {
      area: this._area,
      showLastDot: this._showLastDot,
      yMin: this._yMin,
      yMax: this._yMax,
      locale: this._locale || this.closest('[lang]')?.getAttribute('lang') || undefined,
      label: this.getAttribute('aria-label') ?? this._inputLabel,
      summaryFormatter: this._summaryFormatter,
    });
    if (!view.svg) return html``;
    return html`<svg ${props(view.svg)}>
      ${view.fill ? svg`<path ${props(view.fill)}></path>` : nothing}
      <path ${props(view.line)}></path>
      ${view.dot ? svg`<circle ${props(view.dot)}></circle>` : nothing}
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
