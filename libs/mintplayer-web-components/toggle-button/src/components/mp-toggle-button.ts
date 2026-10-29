import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { FormAssociatedMixin } from '@mintplayer/web-components/a11y';
import { props } from '@mintplayer/web-components/machine';
import {
  checkboxClasses,
  connectCheckbox,
  isToggleButtonColor,
  type ToggleButtonColor,
} from '@mintplayer/ui-core/checkbox';

export type { ToggleButtonColor };

export interface ToggleChangeEventDetail {
  checked: boolean;
  value: string | null;
}

let instanceCounter = 0;

/**
 * `<mp-toggle-button>` — the Lit front of a single Bootstrap on/off button:
 * `input.btn-check` + `label.btn`, rendered in the light DOM (#437) and styled
 * by the page's Bootstrap baseline. The ARIA contract (the native checkbox
 * role and state, validity, error message) comes from
 * `@mintplayer/ui-core/checkbox`, as in the Angular, React and Vue fronts.
 *
 * The element's children become the label's content. The host is
 * form-associated and submits `value` (or `on`) while checked, so the inner
 * input carries no `name` — in the light DOM it would submit a second time.
 *
 * Attributes: `checked`, `disabled` (reflected), `name`, `value`, `color`,
 * `invalid`, `required`, `error-text`, `input-label`. A host `aria-label`,
 * `aria-labelledby` or `aria-describedby` lands on the input — the same tree,
 * so the IDREFs resolve as written. Emits `change` with
 * `detail: { checked, value }` when toggled.
 */
export class MpToggleButton extends FormAssociatedMixin(LitElement) {
  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'invalid',
      'required',
      'error-text',
      'checked',
      'disabled',
      'name',
      'value',
      'color',
      'aria-label',
      'input-label',
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
  private _errorText: string | null = null;
  /** The consumer's children, moved into the label on first render. */
  private _content: Node[] = [];

  private readonly _rootId = `mp-toggle-button-${++instanceCounter}`;
  private readonly _inputRef: Ref<HTMLInputElement> = createRef();

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    // Captured before lit renders into the host, so its own nodes are never taken.
    if (!this.hasUpdated) this._content = Array.from(this.childNodes);
    super.connectedCallback();
  }

  /**
   * Optional override for the input's accessible name. Usually unnecessary —
   * the label's visible content names the control. For an icon-only toggle, or
   * a name that must differ from the visible text, set this.
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
   * Validation message, as `errorText` / `error-text`. Rendered as an
   * `.invalid-feedback` node and referenced from the input by
   * `aria-errormessage` **and** `aria-describedby`, but only while `invalid` is
   * set — `aria-errormessage` is meaningless on a control that is not
   * `aria-invalid`.
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
    if (!isToggleButtonColor(value) || this._color === value) return;
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
      case 'error-text':
        this._errorText = newValue;
        break;
      case 'checked':
        this._checked = newValue !== null;
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        break;
      case 'name':
        this._name = newValue;
        break;
      case 'value':
        this._value = newValue;
        break;
      case 'color': {
        // Removing the attribute restores the default rather than keeping the
        // last value (a framework binding clears an attribute by removing it).
        const color = newValue ?? 'primary';
        if (!isToggleButtonColor(color)) return;
        this._color = color;
        break;
      }
      case 'input-label':
        this._inputLabel = newValue;
        break;
    }
    // Every observed attribute is read in render() — invalid / required /
    // aria-* straight from the host — so each change asks for one.
    this.requestUpdate();
  }

  protected override updated(): void {
    this.syncFormValue();
  }

  override render(): TemplateResult {
    const invalid = this.hasAttribute('invalid');
    const bags = connectCheckbox({
      type: 'toggle_button',
      checked: this._checked,
      indeterminate: false,
      disabled: this._disabled,
      required: this.hasAttribute('required'),
      invalid,
      // The host submits (form-associated); a named inner input would submit twice.
      name: null,
      value: null,
      errorText: this._errorText,
    }, this._rootId, this.getAttribute('aria-describedby'));
    const classes = checkboxClasses('toggle_button', this._color, invalid);
    const input = {
      ...bags.input,
      class: classes.input,
      'aria-label': this.getAttribute('aria-label') ?? this._inputLabel,
      'aria-labelledby': this.getAttribute('aria-labelledby'),
    };
    return html`
      <input
        ${ref(this._inputRef)}
        ${props(input)}
        .checked=${this._checked}
        @change=${this.onInputChange}
      />
      <label class=${classes.label} for=${bags.labelFor ?? nothing}>${this._content}</label>
      ${bags.feedback ? html`<div ${props(bags.feedback.attrs)}>${bags.feedback.text}</div>` : nothing}
    `;
  }

  private reflectBoolean(attr: string, value: boolean): void {
    if (value) this.setAttribute(attr, '');
    else this.removeAttribute(attr);
  }

  private onInputChange = (ev: Event): void => {
    // The input's own change event is not the element's contract; the
    // element's `change` (with detail) is, so stop the native one here.
    ev.stopPropagation();
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

  // ---- form association ----

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
