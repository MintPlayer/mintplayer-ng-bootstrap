import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { props } from '@mintplayer/web-components/machine';
import { connectRadio, radioClasses, type RadioType } from '@mintplayer/ui-core/radio';
import { isToggleButtonColor, type ToggleButtonColor } from '@mintplayer/ui-core/checkbox';

export type MpRadioType = RadioType;

export interface RadioChangeEventDetail {
  checked: boolean;
  value: string | null;
}

let instanceCounter = 0;

/** What an enclosing `<mp-radio-group>` hands its radios. */
interface RadioGroupHost extends HTMLElement {
  readonly groupName: string;
}

/**
 * `<mp-radio>` — the Lit front of a Bootstrap radio (#437): a native
 * `<input type=radio>` in `.form-check` markup, or `.btn-check` + `label.btn`
 * for `type="toggle_button"`, rendered in the light DOM and styled by the
 * page's Bootstrap baseline. The ARIA contract comes from
 * `@mintplayer/ui-core/radio`, as in the Angular, React and Vue fronts.
 *
 * Radios that share a `name` in one document are a native set: the browser
 * supplies exclusivity, the single tab stop, arrow move-and-select and form
 * submission, with JavaScript off as well. Inside an `<mp-radio-group>` the
 * group's name wins over the radio's own. The element's children become the
 * label's content.
 *
 * Attributes: `type`, `checked` (the initial state, like the input's own),
 * `disabled`, `name`, `value`, `color`, `invalid`, `required`, `error-text`,
 * `input-label`. A host `aria-label`, `aria-labelledby` or `aria-describedby`
 * lands on the input. Emits `change` with `detail: { checked, value }` when
 * this radio becomes checked.
 */
export class MpRadio extends LitElement {
  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'invalid',
      'required',
      'error-text',
      'type',
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

  private _type: MpRadioType = 'radio';
  private _checked = false;
  private _disabled = false;
  private _name: string | null = null;
  private _value: string | null = null;
  private _color: ToggleButtonColor = 'secondary';
  private _inputLabel: string | null = null;
  private _errorText: string | null = null;
  /** The consumer's children, moved into the label on first render. */
  private _content: Node[] = [];

  private readonly _rootId = `mp-radio-${++instanceCounter}`;
  private readonly _inputRef: Ref<HTMLInputElement> = createRef();

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    // Captured before lit renders into the host, so its own nodes are never taken.
    if (!this.hasUpdated) this._content = Array.from(this.childNodes);
    super.connectedCallback();
  }

  /** Optional override for the input's accessible name, for a radio with no visible label. */
  get inputLabel(): string | null {
    return this._inputLabel;
  }
  set inputLabel(value: string | null) {
    this._inputLabel = value ?? null;
    this.requestUpdate();
  }

  /**
   * Validation message, as `errorText` / `error-text`, referenced from the
   * input by `aria-errormessage` and `aria-describedby` while `invalid` is set.
   */
  get errorText(): string | null {
    return this._errorText;
  }
  set errorText(value: string | null) {
    this._errorText = value ?? null;
    this.requestUpdate();
  }

  get type(): MpRadioType {
    return this._type;
  }
  set type(value: MpRadioType) {
    if (value !== 'radio' && value !== 'toggle_button') return;
    this._type = value;
    this.requestUpdate();
  }

  /**
   * The live checked state. Once rendered, the input is the state: the browser
   * unchecks a radio when another of its set is picked, and fires no event on
   * the one it unchecks.
   */
  get checked(): boolean {
    return this._inputRef.value?.checked ?? this._checked;
  }
  set checked(value: boolean) {
    this._checked = !!value;
    if (this._inputRef.value) this._inputRef.value.checked = this._checked;
  }

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    const next = !!value;
    if (this._disabled === next) return;
    this._disabled = next;
    if (next) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
    this.requestUpdate();
  }

  get name(): string | null {
    return this._name;
  }
  set name(value: string | null) {
    this._name = value ?? null;
    this.requestUpdate();
  }

  get value(): string | null {
    return this._value;
  }
  set value(value: string | null) {
    this._value = value ?? null;
    this.requestUpdate();
  }

  get color(): ToggleButtonColor {
    return this._color;
  }
  set color(value: ToggleButtonColor) {
    if (!isToggleButtonColor(value)) return;
    this._color = value;
    this.requestUpdate();
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'error-text':
        this._errorText = newValue;
        break;
      case 'type':
        this._type = newValue === 'toggle_button' ? 'toggle_button' : 'radio';
        break;
      case 'checked':
        this.checked = newValue !== null;
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
        // Removing the attribute restores the default rather than keeping the last value.
        const color = newValue ?? 'secondary';
        if (!isToggleButtonColor(color)) return;
        this._color = color;
        break;
      }
      case 'input-label':
        this._inputLabel = newValue;
        break;
    }
    // invalid / required / aria-* are read from the host in render().
    this.requestUpdate();
  }

  private group(): RadioGroupHost | null {
    return this.closest<RadioGroupHost>('mp-radio-group');
  }

  override render(): TemplateResult {
    const group = this.group();
    const invalid = this.hasAttribute('invalid');
    const bags = connectRadio({
      type: this._type,
      checked: this._checked,
      disabled: this._disabled || !!group?.hasAttribute('disabled'),
      required: this.hasAttribute('required') || !!group?.hasAttribute('required'),
      invalid,
      name: group?.groupName ?? this._name,
      value: this._value,
      errorText: this._errorText,
    }, this._rootId, this.getAttribute('aria-describedby'));
    const classes = radioClasses(this._type, this._color, invalid);
    const input = {
      ...bags.input,
      class: classes.input,
      'aria-label': this.getAttribute('aria-label') ?? this._inputLabel,
      'aria-labelledby': this.getAttribute('aria-labelledby'),
    };
    // The checked state is applied once; after that the input owns it (see `checked`).
    const control = html`<input ${ref(this._inputRef)} ${props(input)} ?checked=${this._checked} @change=${this.onInputChange} />`;
    const feedback = bags.feedback ? html`<div ${props(bags.feedback.attrs)}>${bags.feedback.text}</div>` : nothing;
    if (classes.root === null) {
      return html`${control}<label class=${classes.label} for=${bags.labelFor ?? nothing}>${this._content}</label>${feedback}`;
    }
    return html`<label class=${classes.root}>${control}<span class=${classes.label}>${this._content}</span></label>${feedback}`;
  }

  protected override firstUpdated(): void {
    if (this._inputRef.value) this._inputRef.value.checked = this._checked;
  }

  private onInputChange = (ev: Event): void => {
    // The input's own change event is not the element's contract; the
    // element's `change` (with detail) is, so stop the native one here.
    ev.stopPropagation();
    this._checked = (ev.target as HTMLInputElement).checked;
    this.dispatchEvent(
      new CustomEvent<RadioChangeEventDetail>('change', {
        detail: { checked: this._checked, value: this._value },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-radio')) {
  customElements.define('mp-radio', MpRadio);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-radio': MpRadio;
  }
}
