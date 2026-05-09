import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { styles } from './mint-multi-range.element.template';
import { MultiRangeOrientation } from '../types/multi-range-orientation';

/**
 * Bootstrap-flavoured multi-thumb range slider.
 *
 * Block-crossing: thumbs cannot pass their neighbours. Identity is by index —
 * value[0] is always the lowest thumb. The value setter normalises input by
 * sorting ascending and clamping each entry to [min, max]; minDistance is
 * enforced only at user-interaction entry points (pointer + keyboard), not on
 * programmatic writes — callers' arrays are preserved verbatim within bounds.
 *
 * Events:
 *  - `value-input`  fires continuously during drag and on every keyboard step.
 *  - `value-change` fires on commit (pointerup) and after every keyboard step.
 *
 * Both bubble and compose so the Angular wrapper's host listeners pick them up.
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
  private dragState: { thumbIndex: number; pointerId: number } | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
  }

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
    const clamped = input.map(v => this.clampToBounds(v));
    return [...clamped].sort((a, b) => a - b);
  }

  private clampToBounds(v: number): number {
    return Math.min(this.max, Math.max(this.min, v));
  }

  private snapToStep(v: number): number {
    if (!this.step || this.step <= 0) return this.clampToBounds(v);
    const snapped = this.min + Math.round((v - this.min) / this.step) * this.step;
    return this.clampToBounds(snapped);
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

  private isVertical(): boolean {
    return this.orientation === 'vertical';
  }

  private isRtl(): boolean {
    return getComputedStyle(this).direction === 'rtl';
  }

  /**
   * Apply the Block + minDistance constraint to a candidate value for thumb i.
   * Returns the candidate clamped between its (already-respected) neighbours.
   */
  private constrainThumb(values: number[], i: number, candidate: number): number {
    const lower = i > 0 ? values[i - 1] + this.minDistance : this.min;
    const upper = i < values.length - 1 ? values[i + 1] - this.minDistance : this.max;
    return Math.min(Math.max(candidate, lower), upper);
  }

  /** Map a pointer coordinate inside the track rect to a value in [min, max]. */
  private valueFromPointer(clientX: number, clientY: number): number {
    const track = this.renderRoot.querySelector<HTMLElement>('.track');
    if (!track) return this.min;
    const rect = track.getBoundingClientRect();
    let pct: number;
    if (this.isVertical()) {
      pct = (rect.bottom - clientY) / rect.height;
    } else if (this.isRtl()) {
      pct = (rect.right - clientX) / rect.width;
    } else {
      pct = (clientX - rect.left) / rect.width;
    }
    pct = Math.min(1, Math.max(0, pct));
    const raw = this.min + pct * (this.max - this.min);
    return this.snapToStep(raw);
  }

  /** Update one thumb in-place; emit `value-input`. Returns true if value changed. */
  private moveThumb(thumbIndex: number, candidate: number): boolean {
    const current = [...this.value];
    const constrained = this.constrainThumb(current, thumbIndex, this.snapToStep(candidate));
    if (constrained === current[thumbIndex]) return false;
    current[thumbIndex] = constrained;
    this._value = current;
    this.requestUpdate('value');
    this.dispatchEvent(new CustomEvent<number[]>('value-input', {
      detail: [...current],
      bubbles: true,
      composed: true,
    }));
    return true;
  }

  private dispatchValueChange(): void {
    this.dispatchEvent(new CustomEvent<number[]>('value-change', {
      detail: [...this.value],
      bubbles: true,
      composed: true,
    }));
  }

  private startDrag(thumbIndex: number, pointerId: number, target: HTMLElement): void {
    if (this.disabled) return;
    target.setPointerCapture(pointerId);
    target.focus();
    this.dragState = { thumbIndex, pointerId };
    this.requestUpdate();
  }

  private onThumbPointerDown = (thumbIndex: number, ev: PointerEvent): void => {
    if (this.disabled) return;
    this.startDrag(thumbIndex, ev.pointerId, ev.currentTarget as HTMLElement);
  };

  private onTrackPointerDown = (ev: PointerEvent): void => {
    if (this.disabled) return;
    // Ignore clicks that originated on a thumb — those are handled by the thumb's own pointerdown.
    const path = ev.composedPath();
    if (path.some(node => node instanceof HTMLElement && node.classList?.contains('thumb'))) return;
    const targetValue = this.valueFromPointer(ev.clientX, ev.clientY);
    const values = this.value;
    const nearestIndex = this.nearestThumbIndex(values, targetValue);
    if (this.moveThumb(nearestIndex, targetValue)) this.dispatchValueChange();
    // Transfer drag to the nearest thumb so a continued press-and-drag keeps moving it.
    const thumbEl = this.renderRoot.querySelector<HTMLElement>(
      `.thumb[data-thumb-index="${nearestIndex}"]`,
    );
    if (thumbEl) this.startDrag(nearestIndex, ev.pointerId, thumbEl);
  };

  private nearestThumbIndex(values: number[], target: number): number {
    return values.reduce(
      (best, v, i) => (Math.abs(v - target) < Math.abs(values[best] - target) ? i : best),
      0,
    );
  }

  private onPointerMove = (ev: PointerEvent): void => {
    if (!this.dragState || ev.pointerId !== this.dragState.pointerId) return;
    const candidate = this.valueFromPointer(ev.clientX, ev.clientY);
    this.moveThumb(this.dragState.thumbIndex, candidate);
  };

  private onPointerUp = (ev: PointerEvent): void => {
    if (!this.dragState || ev.pointerId !== this.dragState.pointerId) return;
    const target = ev.target as HTMLElement | null;
    if (target?.releasePointerCapture && target.hasPointerCapture(ev.pointerId)) {
      target.releasePointerCapture(ev.pointerId);
    }
    this.dragState = null;
    this.requestUpdate();
    this.dispatchValueChange();
  };

  private onThumbKeyDown = (thumbIndex: number, ev: KeyboardEvent): void => {
    if (this.disabled) return;
    const target = this.keyboardTarget(thumbIndex, ev.key);
    if (target === null) return;
    ev.preventDefault();
    if (this.moveThumb(thumbIndex, target)) this.dispatchValueChange();
  };

  /** Return the target value for a key press, or null if the key isn't bound. */
  private keyboardTarget(thumbIndex: number, key: string): number | null {
    const step = this.step || 1;
    const big = step * 10;
    const current = this.value[thumbIndex];
    const rtl = !this.isVertical() && this.isRtl();
    switch (key) {
      case 'ArrowRight': return current + (rtl ? -step : step);
      case 'ArrowLeft':  return current + (rtl ? step : -step);
      case 'ArrowUp':    return current + step;
      case 'ArrowDown':  return current - step;
      case 'PageUp':     return current + big;
      case 'PageDown':   return current - big;
      case 'Home':       return this.min;
      case 'End':        return this.max;
      default:           return null;
    }
  }

  protected override render(): TemplateResult {
    const values = this.value;
    const vertical = this.isVertical();
    const fills = values.slice(0, -1).map((v, i) => ({
      from: this.percent(v),
      to: this.percent(values[i + 1]),
    }));

    return html`
      <div
        class="track"
        part="track"
        @pointerdown=${this.onTrackPointerDown}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerUp}
      >
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
    const formatted = this.formatThumb(value);
    const isDragging = this.dragState?.thumbIndex === index;
    // aria-valuetext only when formatValue is provided — otherwise aria-valuenow alone is read out.
    const valueText = this.formatValue ? formatted : null;
    return html`
      <button
        class="thumb"
        part="thumb"
        type="button"
        role="slider"
        data-thumb-index=${index}
        data-dragging=${isDragging ? 'true' : 'false'}
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${value}
        aria-orientation=${this.orientation}
        aria-valuetext=${valueText ?? nothing}
        ?disabled=${this.disabled}
        style=${style}
        @pointerdown=${(ev: PointerEvent) => this.onThumbPointerDown(index, ev)}
        @keydown=${(ev: KeyboardEvent) => this.onThumbKeyDown(index, ev)}
      >
        <span class="tooltip" part="tooltip">${formatted}</span>
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
