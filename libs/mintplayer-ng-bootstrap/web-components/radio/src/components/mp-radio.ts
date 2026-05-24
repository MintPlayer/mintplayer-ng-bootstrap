import { LitElement, html, nothing, type TemplateResult } from 'lit';

// Side-effect import: registers `<mp-toggle-button>`. The styles are reused
// by `MpRadio.styles` below — sharing the same `CSSResult` instance means
// Lit attaches one underlying `CSSStyleSheet` to every shadow root that
// includes it (`adoptedStyleSheets`), so each component pays a registration
// cost but the parsed Bootstrap button CSS exists once.
import {
  toggleButtonStyles,
  type ToggleButtonColor,
} from '@mintplayer/web-components/toggle-button';

// `.btn-check` (visually hides the input when used with `type="toggle_button"`)
// + `.form-check` (default `type="radio"` layout) both live in the shared
// form-check stylesheet, alongside `mp-checkbox`.
import { formCheckStyles } from '@mintplayer/web-components/_styles/form-check.styles';

export type MpRadioType = 'radio' | 'toggle_button';

export interface RadioChangeEventDetail {
  checked: boolean;
  value: string | null;
}

const VALID_TYPES: ReadonlySet<string> = new Set(['radio', 'toggle_button']);

const VALID_COLORS: ReadonlySet<string> = new Set([
  'primary', 'secondary', 'success', 'danger',
  'warning', 'info', 'light', 'dark',
  'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger',
  'outline-warning', 'outline-info', 'outline-light', 'outline-dark',
]);

let instanceCounter = 0;

/**
 * `<mp-radio>` — a Bootstrap-styled radio button with two visual variants:
 *
 * - `type="radio"` (default) — standard `.form-check` styling with a round
 *   indicator and a label.
 * - `type="toggle_button"` — `.btn-check` styling rendered as a button
 *   (`.btn .btn-<color>`). Defaults to `color="secondary"` to match the
 *   prior Angular `<bs-radio type="toggle_button">` behaviour.
 *
 * Native one-of-N behaviour relies on multiple inputs sharing a `name` in
 * the same scope. Each `<mp-radio>` keeps its `<input>` inside its own
 * shadow root, so the browser cannot auto-uncheck a sibling for us. A
 * coordinating parent (e.g. the Angular `[bsRadioGroup]` directive or a
 * future `<mp-radio-group>` WC) must listen for `change` and update the
 * other radios' `checked` properties.
 *
 * Emits `change` with `detail: { checked, value }` when this radio
 * transitions to the checked state.
 */
export class MpRadio extends LitElement {
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
      'disabled',
      'name',
      'value',
      'color',
    ];
  }

  private _type: MpRadioType = 'radio';
  private _checked = false;
  private _disabled = false;
  private _name: string | null = null;
  private _value: string | null = null;
  private _color: ToggleButtonColor = 'secondary';
  private readonly _inputId = `mp-radio-${++instanceCounter}`;

  get type(): MpRadioType {
    return this._type;
  }
  set type(value: MpRadioType) {
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
          this._type = newValue as MpRadioType;
          this.requestUpdate();
        }
        break;
      case 'checked':
        this._checked = newValue !== null;
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
    }
  }

  override render(): TemplateResult {
    return this._type === 'toggle_button' ? this.renderToggleButton() : this.renderRadio();
  }

  private renderRadio(): TemplateResult {
    return html`
      <label class="form-check">
        <input
          type="radio"
          class="form-check-input"
          id=${this._inputId}
          .checked=${this._checked}
          ?disabled=${this._disabled}
          name=${this._name ?? nothing}
          value=${this._value ?? nothing}
          @change=${this.onInputChange}
        />
        <span class="form-check-label"><slot></slot></span>
      </label>
    `;
  }

  private renderToggleButton(): TemplateResult {
    return html`
      <input
        type="radio"
        class="btn-check"
        id=${this._inputId}
        .checked=${this._checked}
        ?disabled=${this._disabled}
        name=${this._name ?? nothing}
        value=${this._value ?? nothing}
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
    const next = (ev.target as HTMLInputElement).checked;
    this._checked = next;
    this.reflectBoolean('checked', next);
    this.dispatchEvent(
      new CustomEvent<RadioChangeEventDetail>('change', {
        detail: { checked: next, value: this._value },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-radio')) {
  customElements.define('mp-radio', MpRadio);
}
