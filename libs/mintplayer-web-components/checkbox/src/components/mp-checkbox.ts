import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';

// `formCheckStyles` is a CSSResult holding Bootstrap's `forms/form-check`
// rules (plus a margin-zero override for single-WC layouts). Shared with
// the future `mp-radio` so both WCs adopt a single parsed CSSStyleSheet.
// Lives outside the per-entry tree at libs/.../_styles/ — an internal
// directory, NOT a public sub-entry of @mintplayer/web-components.
import { formCheckStyles } from '../../../_styles/form-check.styles';

// `toggleButtonStyles` covers the `toggle_button` variant (`.btn` rules).
// Side-effect-imports `<mp-toggle-button>` too — same module.
import {
  toggleButtonStyles,
  type ToggleButtonColor,
} from '@mintplayer/web-components/toggle-button';

export type MpCheckboxType = 'checkbox' | 'switch' | 'toggle_button';

export interface CheckboxChangeEventDetail {
  checked: boolean;
  indeterminate: boolean;
  value: string | null;
}

const VALID_TYPES: ReadonlySet<string> = new Set(['checkbox', 'switch', 'toggle_button']);

const VALID_COLORS: ReadonlySet<string> = new Set([
  'primary', 'secondary', 'success', 'danger',
  'warning', 'info', 'light', 'dark',
  'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger',
  'outline-warning', 'outline-info', 'outline-light', 'outline-dark',
]);

let instanceCounter = 0;

/**
 * `<mp-checkbox>` — a Bootstrap-styled checkbox with three visual variants
 * via the `type` attribute:
 *
 * - `checkbox` (default) — `.form-check` with a square indicator.
 * - `switch` — `.form-check.form-switch` for the iOS-style sliding switch.
 * - `toggle_button` — `.btn-check` rendered as a `.btn .btn-<color>`.
 *
 * Supports first-class **tri-state** via the `indeterminate` attribute /
 * property. The visual indeterminate styling is the browser's native
 * `<input>.indeterminate` DOM property; we additionally reflect
 * `aria-checked="mixed"` for AT and mirror the value to a reflected
 * boolean attribute so consumers can target the state from CSS.
 * The native `change` event clears `indeterminate` on the next user click
 * (per HTML spec); consumers that want the master/select-all pattern can
 * re-derive and re-set `indeterminate` from the resulting state.
 *
 * Emits `change` with `detail: { checked, indeterminate, value }`.
 */
export class MpCheckbox extends LitElement {
  static override styles = [formCheckStyles, toggleButtonStyles];

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'type',
      'checked',
      'indeterminate',
      'disabled',
      'name',
      'value',
      'color',
      // Forwarded to the inner <input> in render() so consumers using the
      // WC directly (without the Angular wrapper) can label the control.
      'aria-label',
      'aria-labelledby',
      'aria-describedby',
    ];
  }

  private _type: MpCheckboxType = 'checkbox';
  private _checked = false;
  private _indeterminate = false;
  private _disabled = false;
  private _name: string | null = null;
  private _value: string | null = null;
  private _color: ToggleButtonColor = 'primary';
  private readonly _inputId = `mp-checkbox-${++instanceCounter}`;
  private readonly _inputRef: Ref<HTMLInputElement> = createRef();

  get type(): MpCheckboxType {
    return this._type;
  }
  set type(value: MpCheckboxType) {
    if (!VALID_TYPES.has(value) || this._type === value) return;
    this._type = value;
    this.requestUpdate();
  }

  get checked(): boolean {
    return this._checked;
  }
  set checked(value: boolean) {
    const next = !!value;
    if (this._checked === next) return;
    this._checked = next;
    this.reflectBoolean('checked', next);
    this.requestUpdate();
  }

  get indeterminate(): boolean {
    return this._indeterminate;
  }
  set indeterminate(value: boolean) {
    const next = !!value;
    if (this._indeterminate === next) return;
    this._indeterminate = next;
    this.reflectBoolean('indeterminate', next);
    this.requestUpdate();
  }

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    const next = !!value;
    if (this._disabled === next) return;
    this._disabled = next;
    this.reflectBoolean('disabled', next);
    this.requestUpdate();
  }

  get name(): string | null {
    return this._name;
  }
  set name(value: string | null) {
    const next = value ?? null;
    if (this._name === next) return;
    this._name = next;
    this.requestUpdate();
  }

  get value(): string | null {
    return this._value;
  }
  set value(value: string | null) {
    const next = value ?? null;
    if (this._value === next) return;
    this._value = next;
    this.requestUpdate();
  }

  get color(): ToggleButtonColor {
    return this._color;
  }
  set color(value: ToggleButtonColor) {
    if (!VALID_COLORS.has(value) || this._color === value) return;
    this._color = value;
    this.requestUpdate();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'type':
        if (newValue && VALID_TYPES.has(newValue)) {
          this._type = newValue as MpCheckboxType;
          this.requestUpdate();
        }
        break;
      case 'checked':
        this._checked = newValue !== null;
        this.requestUpdate();
        break;
      case 'indeterminate':
        this._indeterminate = newValue !== null;
        this.requestUpdate();
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        this.requestUpdate();
        break;
      case 'name':
        this._name = newValue;
        this.requestUpdate();
        break;
      case 'value':
        this._value = newValue;
        this.requestUpdate();
        break;
      case 'color':
        if (newValue && VALID_COLORS.has(newValue)) {
          this._color = newValue as ToggleButtonColor;
          this.requestUpdate();
        }
        break;
      case 'aria-label':
      case 'aria-labelledby':
      case 'aria-describedby':
        // Re-render so the inner <input> picks up the new value via
        // `this.getAttribute(...)` in render().
        this.requestUpdate();
        break;
    }
  }

  override render(): TemplateResult {
    return this._type === 'toggle_button' ? this.renderToggleButton() : this.renderCheckOrSwitch();
  }

  // `indeterminate` is a DOM property only (no HTML attribute), so set it
  // after each update from the source-of-truth field. Skipped on the
  // toggle_button variant because btn-check + .active doesn't model a
  // mixed state visually.
  protected override updated(): void {
    const input = this._inputRef.value;
    if (input) input.indeterminate = this._indeterminate && this._type !== 'toggle_button';
  }

  private renderCheckOrSwitch(): TemplateResult {
    const isSwitch = this._type === 'switch';
    const ariaLabel = this.getAttribute('aria-label') ?? undefined;
    const ariaLabelledBy = this.getAttribute('aria-labelledby') ?? undefined;
    const ariaDescribedBy = this.getAttribute('aria-describedby') ?? undefined;
    return html`
      <label class=${isSwitch ? 'form-check form-switch' : 'form-check'}>
        <input
          ${ref(this._inputRef)}
          type="checkbox"
          class="form-check-input"
          id=${this._inputId}
          .checked=${this._checked}
          ?disabled=${this._disabled}
          name=${this._name ?? nothing}
          value=${this._value ?? nothing}
          role=${isSwitch ? 'switch' : nothing}
          aria-checked=${this._indeterminate ? 'mixed' : nothing}
          aria-label=${ifDefined(ariaLabel)}
          aria-labelledby=${ifDefined(ariaLabelledBy)}
          aria-describedby=${ifDefined(ariaDescribedBy)}
          @change=${this.onInputChange}
        />
        <span class="form-check-label"><slot></slot></span>
      </label>
    `;
  }

  private renderToggleButton(): TemplateResult {
    const ariaLabel = this.getAttribute('aria-label') ?? undefined;
    const ariaLabelledBy = this.getAttribute('aria-labelledby') ?? undefined;
    const ariaDescribedBy = this.getAttribute('aria-describedby') ?? undefined;
    return html`
      <input
        ${ref(this._inputRef)}
        type="checkbox"
        class="btn-check"
        id=${this._inputId}
        .checked=${this._checked}
        ?disabled=${this._disabled}
        name=${this._name ?? nothing}
        value=${this._value ?? nothing}
        role="button"
        aria-pressed=${this._checked ? 'true' : 'false'}
        aria-label=${ifDefined(ariaLabel)}
        aria-labelledby=${ifDefined(ariaLabelledBy)}
        aria-describedby=${ifDefined(ariaDescribedBy)}
        @change=${this.onInputChange}
      />
      <label class="btn btn-${this._color}" for=${this._inputId}>
        <slot></slot>
      </label>
    `;
  }

  private reflectBoolean(attr: string, value: boolean): void {
    if (value) this.setAttribute(attr, '');
    else this.removeAttribute(attr);
  }

  private onInputChange = (ev: Event): void => {
    const target = ev.target as HTMLInputElement;
    const nextChecked = target.checked;
    const nextIndeterminate = target.indeterminate;
    this._checked = nextChecked;
    this._indeterminate = nextIndeterminate;
    this.reflectBoolean('checked', nextChecked);
    this.reflectBoolean('indeterminate', nextIndeterminate);
    this.dispatchEvent(
      new CustomEvent<CheckboxChangeEventDetail>('change', {
        detail: {
          checked: nextChecked,
          indeterminate: nextIndeterminate,
          value: this._value,
        },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-checkbox')) {
  customElements.define('mp-checkbox', MpCheckbox);
}
