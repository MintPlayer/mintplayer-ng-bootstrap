import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { styles } from './mint-multi-range.element.template';
import { MultiRangeOrientation } from './types/multi-range-orientation';

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

  // Cached references / state to keep the per-pointermove path off the hot path
  // for getComputedStyle and querySelector. Track ref is set in firstUpdated()
  // and is stable across renders. RTL is captured at gesture start so a single
  // drag stream sees a coherent direction even if the host's `dir` changes mid-air.
  private trackEl: HTMLElement | null = null;
  private rtlDuringGesture: boolean | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
  }

  protected override firstUpdated(): void {
    this.trackEl = this.renderRoot.querySelector<HTMLElement>('.track');
  }

  get value(): number[] {
    return this._value ?? [this.min, this.max];
  }

  set value(next: number[] | null | undefined) {
    const old = this._value;
    const normalised = this.normalise(next);
    // Skip the update entirely when the incoming array is shallow-equal to the
    // current state — the wrapper's effect re-pushes the value on every
    // value-input event during a drag, so without this we'd queue a redundant
    // Lit update for every pointermove.
    if (this.arraysEqual(old, normalised)) return;
    this._value = normalised;
    this.requestUpdate('value', old);
  }

  private arraysEqual(a: number[] | null, b: number[] | null): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
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

  /**
   * Returns whether the host renders in RTL. Uses the cached value if a gesture
   * is active (set in startDrag / onTrackPointerDown), otherwise reads
   * getComputedStyle fresh — direction can come from any ancestor's `dir`,
   * so document.dir or our own attribute aren't sufficient.
   */
  private isRtl(): boolean {
    if (this.rtlDuringGesture !== null) return this.rtlDuringGesture;
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
    const track = this.trackEl ?? this.renderRoot.querySelector<HTMLElement>('.track');
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
    if (this.rtlDuringGesture === null) {
      this.rtlDuringGesture = getComputedStyle(this).direction === 'rtl';
    }
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
    // Capture direction up-front so the first valueFromPointer / nearest-thumb
    // calculation in this gesture sees a consistent value.
    this.rtlDuringGesture = getComputedStyle(this).direction === 'rtl';
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

  /**
   * Returns the index of the thumb closest to `target`. Ties (multiple thumbs
   * stacked at the same value) are broken by direction: clicks to the right of
   * the stack pick the highest-index thumb, clicks to the left pick the
   * lowest. Without this, a stack would always select the lowest-index thumb,
   * which is blocked by its higher-indexed neighbours and can't move toward
   * the click — the user would see no response.
   */
  private nearestThumbIndex(values: number[], target: number): number {
    return values.reduce((best, v, i) => {
      const dBest = Math.abs(values[best] - target);
      const dCur = Math.abs(v - target);
      if (dCur < dBest) return i;
      if (dCur > dBest) return best;
      // Tie. Prefer the thumb on the side of the target so it can move toward it.
      return target > v ? i : best;
    }, 0);
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
    this.rtlDuringGesture = null;
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
    // Use logical `inset-inline-start` so the fill flips correctly in RTL;
    // works as `left` in LTR and `right` in RTL.
    const style = vertical
      ? `bottom: ${segment.from}%; height: ${segment.to - segment.from}%;`
      : `inset-inline-start: ${segment.from}%; width: ${segment.to - segment.from}%;`;
    return html`<div class="fill" part="fill" style=${style}></div>`;
  }

  private renderThumb(value: number, index: number, vertical: boolean): TemplateResult {
    const pct = this.percent(value);
    // Logical `inset-inline-start` so the thumb position flips in RTL.
    const style = vertical ? `bottom: ${pct}%;` : `inset-inline-start: ${pct}%;`;
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
