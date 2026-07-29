import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';

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
// form-check stylesheet, alongside `mp-checkbox`. Internal `_styles/` dir,
// reached via relative path — not a public sub-entry of the package.
import { formCheckStyles } from '../../../_styles/form-check.styles';
import { invalidFeedbackStyles } from '../../../_styles/invalid-feedback.styles';
import {
  HostAriaController,
  errorFeedback,
  errorFeedbackElements,
} from '@mintplayer/web-components/a11y';

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
 * coordinating parent — `<mp-radio-group>`, or the Angular `[bsRadioGroup]`
 * directive on hosts where that element can't be used — must listen for
 * `change` and update the other radios' `checked` properties.
 *
 * Emits `change` with `detail: { checked, value }` when this radio
 * transitions to the checked state.
 */
export class MpRadio extends LitElement {
  static override styles = [formCheckStyles, toggleButtonStyles, invalidFeedbackStyles];

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'invalid',
      'required',
      // Validation message rendered inside the shadow root and referenced by the
      // inner <input>; shown only while `invalid` is also set.
      'error-text',
      'type',
      'checked',
      'disabled',
      'name',
      'value',
      'color',
      // Copied to the inner <input> in render(); the slotted label already names
      // the control (flat-tree label association), so these are overrides.
      'aria-label',
      'input-label',
      // NOT copied inward — resolved into element references against the host's
      // tree by hostAria.syncReferences(); an IDREF string cannot cross the
      // shadow boundary.
      'aria-labelledby',
      'aria-describedby',
    ];
  }

  private _type: MpRadioType = 'radio';
  private _checked = false;
  private _disabled = false;
  private _name: string | null = null;
  private _value: string | null = null;
  private _color: ToggleButtonColor = 'secondary';
  private _inputLabel: string | null = null;
  private _errorText: string | null = null;

  /**
   * Tier-2 naming. No role on the host: the inner <input> is the real control, so
   * a host role would announce the radio twice. References target that <input>.
   */
  private readonly hostAria = new HostAriaController(this, {
    referenceTarget: () => this._inputRef.value ?? null,
    describedByExtras: () => errorFeedbackElements(this.renderRoot),
  });
  private readonly _inputId = `mp-radio-${++instanceCounter}`;
  private readonly _errorId = `mp-radio-${instanceCounter}-error`;
  private readonly _inputRef: Ref<HTMLInputElement> = createRef();

  /**
   * Optional override for the inner <input>'s accessible name. Usually
   * unnecessary: the slotted visible text already names the control through the
   * flat-tree label association (slotted-label spike; verdict in the plan). For a radio
   * with no visible text, or a name that must differ from it, set this.
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

  /**
   * Validation message, as `errorText` / `error-text`. Rendered as a
   * `.invalid-feedback` node inside the shadow root and referenced from the inner
   * `<input>` by `aria-errormessage` **and** `aria-describedby`, but only while
   * `invalid` is set — `aria-errormessage` is meaningless on a control that is not
   * `aria-invalid`.
   *
   * On a radio the message belongs to the whole group, not to one option, so put
   * it on the radio the group's validity is anchored to (or on each, which
   * repeats it). Text rather than a node because a consumer's own element lives
   * outside this shadow root, where an IDREF from the inner input cannot reach it.
   */
  get errorText(): string | null {
    return this._errorText;
  }
  set errorText(value: string | null) {
    const next = value ?? null;
    if (this._errorText === next) return;
    this._errorText = next;
    this.requestUpdate();
  }

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

  private _groupTabIndex: number | null = null;
  private _groupPosInSet: number | null = null;
  private _groupSetSize: number | null = null;

  /**
   * Roving tab stop, written by an enclosing `<mp-radio-group>`. With
   * delegatesFocus a tabindex on the HOST cannot take the inner input out of
   * the tab order — the input's own tabindex is the only lever, and it lives
   * behind the shadow boundary, hence this property. Coordination state, not
   * author API: property-only, no attribute.
   */
  get groupTabIndex(): number | null {
    return this._groupTabIndex;
  }
  set groupTabIndex(value: number | null) {
    const next = value ?? null;
    if (this._groupTabIndex === next) return;
    this._groupTabIndex = next;
    this.requestUpdate();
  }

  /**
   * Set-position pair, written by the enclosing group. They belong on the
   * inner `<input>` — the role bearer — because aria-posinset on a role-less
   * host is dropped by AT, and shadow roots keep native name-grouping (the
   * usual "2 of 3" source) from ever forming.
   */
  get groupPosInSet(): number | null {
    return this._groupPosInSet;
  }
  set groupPosInSet(value: number | null) {
    const next = value ?? null;
    if (this._groupPosInSet === next) return;
    this._groupPosInSet = next;
    this.requestUpdate();
  }

  get groupSetSize(): number | null {
    return this._groupSetSize;
  }
  set groupSetSize(value: number | null) {
    const next = value ?? null;
    if (this._groupSetSize === next) return;
    this._groupSetSize = next;
    this.requestUpdate();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      // Read from the host in render(), so a change has to ask for one — without
      // this, aria-invalid / aria-required froze at their first-render values and
      // an error message could never appear on a control that started out valid.
      case 'invalid':
      case 'required':
        this.requestUpdate();
        break;
      case 'error-text':
        this._errorText = newValue;
        this.requestUpdate();
        break;
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

  // After every render, not once: element references point at a specific node,
  // and switching `type` replaces the <input> outright. See mp-checkbox's aria
  // spec, where the same transition is exercised.
  protected override updated(): void {
    this.hostAria.syncReferences();
  }

  override render(): TemplateResult {
    return this._type === 'toggle_button' ? this.renderToggleButton() : this.renderRadio();
  }

  private renderRadio(): TemplateResult {
    const error = this.errorFeedback();
    return html`
      <label class="form-check">
        <input
          ${ref(this._inputRef)}
          type="radio"
          class="form-check-input"
          id=${this._inputId}
          .checked=${this._checked}
          ?disabled=${this._disabled}
          aria-invalid=${this.hasAttribute('invalid') ? 'true' : nothing}
          aria-required=${this.hasAttribute('required') ? 'true' : nothing}
          aria-errormessage=${error.id}
          aria-describedby=${error.id}
          name=${this._name ?? nothing}
          value=${this._value ?? nothing}
          tabindex=${this._groupTabIndex ?? nothing}
          aria-posinset=${this._groupPosInSet ?? nothing}
          aria-setsize=${this._groupSetSize ?? nothing}
          aria-label=${this.getAttribute('aria-label') ?? this._inputLabel ?? nothing}
          @change=${this.onInputChange}
        />
        <span class="form-check-label"><slot></slot></span>
      </label>
      ${error.node}
    `;
  }

  private errorFeedback() {
    return errorFeedback(this._errorId, this._errorText, this.hasAttribute('invalid'));
  }

  private renderToggleButton(): TemplateResult {
    const error = this.errorFeedback();
    return html`
      <input
        ${ref(this._inputRef)}
        type="radio"
        class="btn-check"
        id=${this._inputId}
        .checked=${this._checked}
        ?disabled=${this._disabled}
          aria-invalid=${this.hasAttribute('invalid') ? 'true' : nothing}
          aria-required=${this.hasAttribute('required') ? 'true' : nothing}
        aria-errormessage=${error.id}
        aria-describedby=${error.id}
        name=${this._name ?? nothing}
        value=${this._value ?? nothing}
        tabindex=${this._groupTabIndex ?? nothing}
        aria-posinset=${this._groupPosInSet ?? nothing}
        aria-setsize=${this._groupSetSize ?? nothing}
        aria-label=${this.getAttribute('aria-label') ?? this._inputLabel ?? nothing}
        @change=${this.onInputChange}
      />
      <label class="btn btn-${this._color}" for=${this._inputId}>
        <slot></slot>
      </label>
      ${error.node}
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
