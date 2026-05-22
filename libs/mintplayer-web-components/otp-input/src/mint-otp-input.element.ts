import { LitElement, html, type TemplateResult } from 'lit';
import { styles } from './mint-otp-input.element.template';
import { OtpInputType } from '../types/otp-input-type';
import { OtpInputCase } from '../types/otp-input-case';
import { OtpInputSize } from '../types/otp-input-size';

/**
 * Bootstrap-flavoured OTP / segmented-code input.
 *
 * Architecture: one hidden full-width `<input>` owns focus / paste / IME /
 * SMS autofill; decorative `<span>` boxes render slices of the value at fixed
 * positions. Boxes are `aria-hidden`; screen readers see one text input.
 *
 * Layout via `groups: number[]` — each array element is the character capacity
 * of one visual box. `[1,1,1,1,1,1]` (default) is the classic 6-digit OTP;
 * `[6,6,4,4,6,6]` is the MS Office product-key shape.
 *
 * Events:
 *  - `value-change` fires on every keystroke, paste, and clear, payload is the
 *    current (possibly partial) value string.
 *  - `complete` fires once when the value transitions from incomplete to
 *    `length === sum(groups)` via user interaction. Re-fires on re-completion.
 *    Does NOT fire on programmatic writes via the `value` setter.
 *
 * Both bubble and compose so an Angular wrapper's host listeners pick them up.
 */
export class MintOtpInputElement extends LitElement {
  static override styles = [styles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'type',
      'case',
      'size',
      'disabled',
      'label',
      'invalid',
      'groups',
    ];
  }

  static override properties = {
    value: { attribute: false },
    groups: {
      attribute: 'groups',
      converter: {
        fromAttribute: (s: string | null): number[] => {
          if (!s) return [...MintOtpInputElement.DEFAULT_GROUPS];
          const parsed = s.split(',').map(p => Number(p.trim())).filter(n => Number.isFinite(n));
          return parsed.length > 0 ? parsed : [...MintOtpInputElement.DEFAULT_GROUPS];
        },
        toAttribute: (v: number[] | null): string | null =>
          Array.isArray(v) ? v.join(',') : null,
      },
      reflect: false,
    },
    type: { attribute: 'type', type: String, reflect: true },
    case: { attribute: 'case', type: String, reflect: true },
    size: { attribute: 'size', type: String, reflect: true },
    disabled: { attribute: 'disabled', type: Boolean, reflect: true },
    label: { attribute: 'label', type: String, reflect: false },
    invalid: { attribute: 'invalid', type: Boolean, reflect: true },
  };

  type: OtpInputType = 'numeric';
  case: OtpInputCase = 'upper';
  size: OtpInputSize = 'md';
  disabled = false;
  label: string | null = null;
  invalid = false;

  static readonly MAX_GROUP_SIZE = 10;
  static readonly MAX_TOTAL = 40;
  // Read-only array contract via type; callers spread to copy. Don't Object.freeze
  // — the spread already protects against mutation in the only consumer path
  // (normaliseGroups' fallback), and freeze would throw on accidental mutation
  // by external WC consumers rather than silently letting their copy diverge.
  static readonly DEFAULT_GROUPS: readonly number[] = [1, 1, 1, 1, 1, 1];
  static readonly REVEAL_MS = 700;
  static readonly MASK_CHAR = '•';

  private _value = '';
  private _groups: number[] = [...MintOtpInputElement.DEFAULT_GROUPS];
  private _revealedIndex: number | null = null;
  private _revealedUntil = 0;
  private _revealTimer: ReturnType<typeof setTimeout> | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _isFocused = false;

  get value(): string {
    return this._value;
  }

  set value(next: string | null | undefined) {
    const old = this._value;
    const normalised = this.normaliseValue(next ?? '');
    if (old === normalised) return;
    this._value = normalised;
    this.clearReveal();
    this.requestUpdate('value', old);
  }

  get groups(): number[] {
    return this._groups;
  }

  set groups(next: number[] | null | undefined) {
    const old = this._groups;
    const normalised = this.normaliseGroups(next);
    if (this.arraysEqual(old, normalised)) return;
    this._groups = normalised;
    const total = this.totalLength();
    let valueMutated = false;
    if (this._value.length > total) {
      this._value = this._value.slice(0, total);
      valueMutated = true;
    }
    this.requestUpdate('groups', old);
    // When the new groups shape shortens the total length, the canonical value
    // must drop the overflow characters — and the consumer needs to know,
    // otherwise an Angular FormControl bound via the wrapper's CVA would
    // remain at the stale longer value.
    if (valueMutated) this.dispatchValueChange();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._revealTimer) {
      clearTimeout(this._revealTimer);
      this._revealTimer = null;
    }
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    super.willUpdate(changedProperties);
    // When `type` or `case` changes, re-run the filter/normalisation against
    // the current value. Without this, switching from `alphanumeric` to
    // `numeric` while the field holds "ABC123" would leave "ABC123" in place
    // — type says digits-only but the rendered value disagrees. Doing this
    // in `willUpdate` (rather than `updated`) folds the value mutation into
    // the same update cycle that already runs for the type/case change, so
    // we don't trigger Lit's "scheduled an update from updated()" warning.
    if (changedProperties.has('type') || changedProperties.has('case')) {
      const next = this.normaliseValue(this._value);
      if (next !== this._value) {
        this._value = next;
        this.clearReveal();
        this.dispatchValueChange();
      }
    }
  }

  protected override firstUpdated(): void {
    this._inputEl = this.renderRoot.querySelector<HTMLInputElement>('.hidden-input');
  }

  override focus(options?: FocusOptions): void {
    const el = this._inputEl ?? this.renderRoot.querySelector<HTMLInputElement>('.hidden-input');
    el?.focus(options);
  }

  clear(): void {
    if (this._value === '') return;
    this._value = '';
    this.clearReveal();
    if (this._inputEl) this._inputEl.value = '';
    this.requestUpdate();
    this.dispatchValueChange();
  }

  // ------- internals -------

  private totalLength(): number {
    return this._groups.reduce((sum, n) => sum + n, 0);
  }

  private boundaries(): number[] {
    const out: number[] = [0];
    for (const n of this._groups) out.push(out[out.length - 1] + n);
    return out;
  }

  private normaliseGroups(input: number[] | null | undefined): number[] {
    if (!input || !Array.isArray(input) || input.length === 0) {
      console.warn('[mp-otp-input] groups must be a non-empty array; falling back to default.');
      return [...MintOtpInputElement.DEFAULT_GROUPS];
    }
    let didClamp = false;
    const cleaned: number[] = input.map(n => {
      const i = Math.round(Number(n));
      if (!Number.isFinite(i) || i < 1) { didClamp = true; return 1; }
      if (i > MintOtpInputElement.MAX_GROUP_SIZE) { didClamp = true; return MintOtpInputElement.MAX_GROUP_SIZE; }
      return i;
    });
    // Maintain a running sum so the trim loop is O(N) instead of O(N²) —
    // arrays are tiny in practice, but the linear form also reads more
    // honestly (the loop variable is the live total, not a re-computed one).
    let sum = cleaned.reduce((a, b) => a + b, 0);
    while (sum > MintOtpInputElement.MAX_TOTAL && cleaned.length > 1) {
      sum -= cleaned.pop()!;
      didClamp = true;
    }
    if (cleaned.length === 1 && cleaned[0] > MintOtpInputElement.MAX_TOTAL) {
      cleaned[0] = MintOtpInputElement.MAX_TOTAL;
      didClamp = true;
    }
    if (didClamp) {
      console.warn(`[mp-otp-input] groups clamped to ${JSON.stringify(cleaned)} (per-element max ${MintOtpInputElement.MAX_GROUP_SIZE}, total max ${MintOtpInputElement.MAX_TOTAL}).`);
    }
    return cleaned;
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  /** Filter to allowed chars per `type`, normalise per `case`, truncate. */
  private normaliseValue(input: string): string {
    const filtered = this.type === 'numeric'
      ? input.replace(/[^0-9]/g, '')
      : input.replace(/[^a-zA-Z0-9]/g, '');
    const cased = this.type === 'numeric'
      ? filtered
      : this.case === 'upper'
        ? filtered.toUpperCase()
        : this.case === 'lower'
          ? filtered.toLowerCase()
          : filtered;
    return cased.slice(0, this.totalLength());
  }

  // ------- event handlers -------

  private onInput = (ev: Event): void => {
    const target = ev.target as HTMLInputElement;
    const rawIn = target.value;
    const oldValue = this._value;
    const wasComplete = oldValue.length === this.totalLength() && oldValue.length > 0;
    const normalised = this.normaliseValue(rawIn);

    // Single-char keystrokes (length grew by exactly 1) trigger the password reveal
    // window. Multi-char inserts (paste-via-input, IME commit, autofill) and any
    // shrink (delete) do not reveal — paste and autofill have their own paths
    // that explicitly clear; deletions shouldn't show a "•" → real-char flash.
    const sizeDelta = normalised.length - oldValue.length;
    if (this.type === 'password' && sizeDelta === 1) {
      this.scheduleReveal(normalised.length - 1);
    } else if (sizeDelta !== 1) {
      // Multi-char insert or any delete: clear any pending reveal so we don't
      // leak a previously-revealed char into a new state.
      this.clearReveal();
    }

    this._value = normalised;
    // Re-sync the input's value to the normalised form (strips junk the user
    // might have typed, e.g. a letter into a numeric field). Setting .value
    // collapses caret to end which is the correct UX for fill-from-end.
    if (target.value !== normalised) target.value = normalised;
    this.requestUpdate();
    this.dispatchValueChange();

    const nowComplete = normalised.length === this.totalLength();
    if (nowComplete && !wasComplete) {
      this.clearReveal();
      this.dispatchComplete();
    }
  };

  private onPaste = (ev: ClipboardEvent): void => {
    if (this.disabled) return;
    ev.preventDefault();
    const text = ev.clipboardData?.getData('text') ?? '';
    const oldValue = this._value;
    const wasComplete = oldValue.length === this.totalLength() && oldValue.length > 0;
    // Paste fills from index 0 regardless of caret position. This avoids the
    // iOS gotcha where a user taps a non-first box then pastes the full code.
    const normalised = this.normaliseValue(text);
    this._value = normalised;
    if (this._inputEl) this._inputEl.value = normalised;
    this.clearReveal(); // paste NEVER reveals (shoulder-surf risk on a code the user already knows)
    this.requestUpdate();
    this.dispatchValueChange();
    const nowComplete = normalised.length === this.totalLength();
    if (nowComplete && !wasComplete) this.dispatchComplete();
  };

  private onFocus = (): void => {
    // Track focus so the active-box highlight only renders while the hidden
    // input is actually focused. Without this every instance on the page shows
    // a blue ring on the "next" box at all times, which makes side-by-side
    // demos look like every box is competing for input.
    this._isFocused = true;
    this.requestUpdate();
  };

  private onBlur = (): void => {
    // Mask immediately on blur regardless of timer state, and drop the
    // active-box highlight along with focus.
    this._isFocused = false;
    this.clearReveal();
    this.requestUpdate();
  };

  private onCaretMove = (): void => {
    // Re-render so the active-box highlight follows caret movement (e.g. user
    // clicked into the input or used arrow keys).
    this.requestUpdate();
  };

  // ------- reveal helpers -------

  private scheduleReveal(index: number): void {
    if (this._revealTimer) clearTimeout(this._revealTimer);
    this._revealedIndex = index;
    this._revealedUntil = performance.now() + MintOtpInputElement.REVEAL_MS;
    this._revealTimer = setTimeout(() => {
      this._revealedIndex = null;
      this._revealedUntil = 0;
      this._revealTimer = null;
      this.requestUpdate();
    }, MintOtpInputElement.REVEAL_MS);
  }

  private clearReveal(): void {
    if (this._revealTimer) {
      clearTimeout(this._revealTimer);
      this._revealTimer = null;
    }
    this._revealedIndex = null;
    this._revealedUntil = 0;
  }

  // ------- event dispatch -------

  private dispatchValueChange(): void {
    this.dispatchEvent(new CustomEvent<string>('value-change', {
      detail: this._value,
      bubbles: true,
      composed: true,
    }));
  }

  private dispatchComplete(): void {
    this.dispatchEvent(new CustomEvent<string>('complete', {
      detail: this._value,
      bubbles: true,
      composed: true,
    }));
  }

  // ------- render -------

  protected override render(): TemplateResult {
    const groups = this._groups;
    const value = this._value;
    const bounds = this.boundaries();
    const total = bounds[bounds.length - 1];
    const caretPos = this._inputEl?.selectionEnd ?? value.length;
    // Active-box highlight only renders while the hidden input has focus;
    // otherwise every demo / unfocused instance lights up its next-to-fill box
    // even though it's not accepting input.
    const activeBoxIndex = this._isFocused ? this.activeBoxIndex(caretPos, value.length, bounds) : null;
    const isClassicOtp = this.type === 'numeric' && groups.every(g => g === 1);
    const autocomplete = isClassicOtp ? 'one-time-code' : 'off';
    const inputMode = this.type === 'numeric' ? 'numeric' : 'text';
    const labelText = this.label ?? 'One-time code';

    return html`
      <div class="container" part="container">
        <input
          class="hidden-input"
          part="input"
          .value=${value}
          autocomplete=${autocomplete}
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          inputmode=${inputMode}
          maxlength=${total}
          ?disabled=${this.disabled}
          aria-label=${labelText}
          aria-invalid=${this.invalid ? 'true' : 'false'}
          @input=${this.onInput}
          @paste=${this.onPaste}
          @focus=${this.onFocus}
          @blur=${this.onBlur}
          @keyup=${this.onCaretMove}
          @click=${this.onCaretMove}
        />
        ${groups.map((groupLen, i) =>
          this.renderBox(i, groupLen, bounds, value, activeBoxIndex),
        )}
      </div>
    `;
  }

  private renderBox(
    boxIndex: number,
    groupLen: number,
    bounds: number[],
    value: string,
    activeBoxIndex: number | null,
  ): TemplateResult {
    const start = bounds[boxIndex];
    const end = bounds[boxIndex + 1];
    const slice = value.slice(start, Math.min(end, value.length));
    const filled = value.length >= end;
    const partial = !filled && slice.length > 0;
    const active = activeBoxIndex === boxIndex;
    const displayContent = this.renderSliceContent(slice, start);
    const partsList = ['box'];
    if (filled || partial) partsList.push('box-filled');
    if (active) partsList.push('box-active');
    if (this.invalid) partsList.push('box-invalid');
    const classes = partsList.join(' ');
    // The hidden spacer reserves width for groupLen monospace characters so
    // the box doesn't reflow as the user types into it. Use repeat('M') as a
    // wide reference char (M is wider than digits in most non-monospace fonts,
    // so this is conservative if the monospace font falls back).
    const spacer = 'M'.repeat(groupLen);
    return html`
      <span class=${classes} part=${partsList.join(' ')} aria-hidden="true">
        <span class="box-spacer">${spacer}</span>
        <span class="box-content">${displayContent}</span>
      </span>
    `;
  }

  /** Build the displayed string for a slice, applying password reveal. */
  private renderSliceContent(slice: string, startIndex: number): string {
    if (this.type !== 'password' || slice.length === 0) return slice;
    const now = performance.now();
    let out = '';
    for (let i = 0; i < slice.length; i++) {
      const globalIdx = startIndex + i;
      if (globalIdx === this._revealedIndex && now < this._revealedUntil) {
        out += slice[i];
      } else {
        out += MintOtpInputElement.MASK_CHAR;
      }
    }
    return out;
  }

  /**
   * Returns the index of the visual box that should be highlighted as "active"
   * given the caret position and current value length.
   *
   * Rules:
   *  - Caret before all boxes (rare): first box.
   *  - Caret at the end of a filled value with more boxes to fill: the next
   *    box (the one the user is about to type into).
   *  - Caret at totalLength (everything filled): last box.
   *  - Otherwise: the box whose [start, end) range contains caretPos.
   */
  private activeBoxIndex(caretPos: number, valueLen: number, bounds: number[]): number | null {
    if (this._groups.length === 0) return null;
    const total = bounds[bounds.length - 1];
    const effective = Math.min(caretPos, total);
    if (effective >= total) return this._groups.length - 1;
    for (let i = 0; i < bounds.length - 1; i++) {
      if (effective >= bounds[i] && effective < bounds[i + 1]) return i;
    }
    return this._groups.length - 1;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-otp-input')) {
  customElements.define('mp-otp-input', MintOtpInputElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-otp-input': MintOtpInputElement;
  }
}
