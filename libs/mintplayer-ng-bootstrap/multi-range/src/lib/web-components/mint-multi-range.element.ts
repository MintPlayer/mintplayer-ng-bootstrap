import { LitElement, html, type TemplateResult } from 'lit';
import { styles } from './mint-multi-range.element.template';
import { MultiRangeOrientation } from '../types/multi-range-orientation';

/**
 * Bootstrap-flavoured multi-thumb range slider.
 *
 * Block-crossing: thumbs cannot pass their neighbours. Identity is by index —
 * value[0] is always the leftmost / lowest thumb. The value setter normalises
 * input by sorting ascending and clamping each entry to [min, max].
 *
 * Interaction (pointer/keyboard) is wired in M2; ARIA in M5.
 */
export class MintMultiRangeElement extends LitElement {
  static override styles = [styles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'min',
      'max',
      'step',
      'min-distance',
      'orientation',
      'disabled',
    ];
  }

  static override properties = {
    value: { attribute: false },
    min: { attribute: 'min', type: Number, reflect: true },
    max: { attribute: 'max', type: Number, reflect: true },
    step: { attribute: 'step', type: Number, reflect: true },
    minDistance: { attribute: 'min-distance', type: Number },
    orientation: { attribute: 'orientation', type: String, reflect: true },
    disabled: { attribute: 'disabled', type: Boolean, reflect: true },
    formatValue: { attribute: false },
  };

  min = 0;
  max = 100;
  step = 1;
  minDistance = 0;
  orientation: MultiRangeOrientation = 'horizontal';
  disabled = false;
  formatValue: ((value: number) => string) | null = null;

  private _value: number[] | null = null;

  /**
   * Current thumb values. Always rendered ascending; index = identity.
   * Setting undefined / null / empty resets to [min, max].
   */
  get value(): number[] {
    return this._value ?? [this.min, this.max];
  }

  set value(next: number[] | null | undefined) {
    const old = this._value;
    this._value = this.normalise(next);
    this.requestUpdate('value', old);
  }

  private normalise(input: number[] | null | undefined): number[] | null {
    if (!input || input.length === 0) return null;
    const clamped = input.map(v => Math.min(this.max, Math.max(this.min, v)));
    return [...clamped].sort((a, b) => a - b);
  }

  private percent(value: number): number {
    const range = this.max - this.min;
    if (range <= 0) return 0;
    return ((value - this.min) / range) * 100;
  }

  private formatThumb(value: number): string {
    if (this.formatValue) {
      try { return this.formatValue(value); } catch { return String(value); }
    }
    return String(value);
  }

  protected override render(): TemplateResult {
    const values = this.value;
    const vertical = this.orientation === 'vertical';
    const fills = values.slice(0, -1).map((v, i) => ({
      from: this.percent(v),
      to: this.percent(values[i + 1]),
    }));

    return html`
      <div class="track" part="track">
        ${fills.map(f => this.renderFill(f, vertical))}
        ${values.map((v, i) => this.renderThumb(v, i, vertical))}
      </div>
    `;
  }

  private renderFill(
    segment: { from: number; to: number },
    vertical: boolean,
  ): TemplateResult {
    const style = vertical
      ? `bottom: ${segment.from}%; height: ${segment.to - segment.from}%;`
      : `left: ${segment.from}%; width: ${segment.to - segment.from}%;`;
    return html`<div class="fill" part="fill" style=${style}></div>`;
  }

  private renderThumb(value: number, index: number, vertical: boolean): TemplateResult {
    const pct = this.percent(value);
    const style = vertical ? `bottom: ${pct}%;` : `left: ${pct}%;`;
    return html`
      <button
        class="thumb"
        part="thumb"
        type="button"
        data-thumb-index=${index}
        ?disabled=${this.disabled}
        style=${style}
      >
        <span class="tooltip" part="tooltip">${this.formatThumb(value)}</span>
      </button>
    `;
  }

  /** Returns a copy of the current values. */
  getValues(): number[] {
    return [...this.value];
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-multi-range')) {
  customElements.define('mp-multi-range', MintMultiRangeElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-multi-range': MintMultiRangeElement;
  }
}
