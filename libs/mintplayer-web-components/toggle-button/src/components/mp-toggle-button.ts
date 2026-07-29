import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { HostAriaController, FormAssociatedMixin } from '@mintplayer/web-components/a11y';
import { toggleButtonStyles } from '../styles';

/** Bootstrap button-color tokens that map to a `.btn-<color>` class. */
export type ToggleButtonColor =
  | 'primary' | 'secondary' | 'success' | 'danger'
  | 'warning' | 'info' | 'light' | 'dark'
  | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger'
  | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';

const VALID_COLORS: ReadonlySet<string> = new Set([
  'primary', 'secondary', 'success', 'danger',
  'warning', 'info', 'light', 'dark',
  'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger',
  'outline-warning', 'outline-info', 'outline-light', 'outline-dark',
]);

export interface ToggleChangeEventDetail {
  checked: boolean;
  value: string | null;
}

let instanceCounter = 0;

/**
 * `<mp-toggle-button>` — a single Bootstrap-styled on/off button using the
 * `btn-check` + `label.btn` pattern. Acts as both a usable standalone WC
 * and the carrier of the shared `form-check` / `btn-check` SCSS that
 * `<mp-checkbox>` and `<mp-radio>` reuse via the exported `toggleButtonStyles`
 * `CSSResult` (single parsed stylesheet shared across shadow roots).
 *
 * Attributes (all reflected): `checked`, `disabled`, `name`, `value`, `color`.
 * Emits a native-style `change` event with
 * `detail: { checked, value }` when toggled.
 */
export class MpToggleButton extends FormAssociatedMixin(LitElement) {
  static override styles = [toggleButtonStyles];

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'invalid',
      'required',
      'checked',
      'disabled',
      'name',
      'value',
      'color',
      // Copied to the inner <input>; the slotted label already names the control
      // (flat-tree label association), so these are overrides.
      'aria-label',
      'input-label',
      // Resolved into element references against the host's tree — an IDREF
      // string cannot cross the shadow boundary.
      'aria-labelledby',
      'aria-describedby',
    ];
  }

  private _checked = false;
  private _disabled = false;
  private _name: string | null = null;
  private _value: string | null = null;
  private _color: ToggleButtonColor = 'primary';
  private _inputLabel: string | null = null;

  /** Tier-2 naming; references target the real control inside the shadow root. */
  private readonly hostAria = new HostAriaController(this, {
    referenceTarget: () => this._inputRef.value ?? null,
  });
  private readonly _inputId = `mp-toggle-button-${++instanceCounter}`;
  private readonly _inputRef: Ref<HTMLInputElement> = createRef();

  /**
   * Optional override for the inner <input>'s accessible name. Usually
   * unnecessary — the slotted visible text names the control through the
   * flat-tree label association (slotted-label spike; verdict in the plan). For an icon-only
   * toggle, or a name that must differ from the visible text, set this.
   */
  get inputLabel(): string | null {
    return this._inputLabel;
  }
  set inputLabel(value: string | null) {
    const next = value ?? null;
    if (this._inputLabel === next) return;
    this._inputLabel = next;
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
      case 'aria-label':
        this.requestUpdate();
        break;
      case 'input-label':
        this._inputLabel = newValue;
        this.requestUpdate();
        break;
      case 'aria-labelledby':
      case 'aria-describedby':
        this.hostAria.syncReferences();
        break;
    }
  }

  // After every render — element references point at a specific node, and Lit
  // may replace the <input> on re-render.
  protected override updated(): void {
    this.syncFormValue();
    this.hostAria.syncReferences();
  }

  override render(): TemplateResult {
    return html`
      <input
        ${ref(this._inputRef)}
        type="checkbox"
        class="btn-check"
        id=${this._inputId}
        .checked=${this._checked}
        ?disabled=${this._disabled}
          aria-invalid=${this.hasAttribute('invalid') ? 'true' : nothing}
          aria-required=${this.hasAttribute('required') ? 'true' : nothing}
        name=${this._name ?? nothing}
        value=${this._value ?? nothing}
        aria-label=${this.getAttribute('aria-label') ?? this._inputLabel ?? nothing}
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
      new CustomEvent<ToggleChangeEventDetail>('change', {
        detail: { checked: next, value: this._value },
        bubbles: true,
        composed: true,
      }),
    );
  };

  // ---- form association (FormAssociatedHost, Phase F) ----

  formValue(): string | null {
    return this._checked ? (this._value ?? 'on') : null;
  }

  formReset(): void {
    this._checked = false;
    if (this.hasAttribute('checked')) this.removeAttribute('checked');
    this.requestUpdate();
  }

  formRestore(state: string | FormData | File | null): void {
    this._checked = state != null;
    this.requestUpdate();
  }

  formValidityAnchor(): HTMLElement | null {
    return this._inputRef.value ?? null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-toggle-button')) {
  customElements.define('mp-toggle-button', MpToggleButton);
}
