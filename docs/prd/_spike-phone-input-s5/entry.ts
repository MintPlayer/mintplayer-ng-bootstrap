/* Spike S5 fixture — FACE-in-FACE isolation + the nested-delegatesFocus focus model.
   Throwaway: bundled to bundle.js with esbuild, served by server.mjs, driven by
   s5.spike-test.ts. Deleted before merge.

   The elements below are deliberately minimal, but the FORM-ASSOCIATION semantics
   are the REAL ones: `FormAssociatedMixin` is imported from the library source, not
   reimplemented, so anything this spike measures about formValue/formDisabledCallback/
   formResetCallback/setValidity ordering is what mp-phone-input will get. */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { FormAssociatedMixin } from '../../../libs/mintplayer-web-components/a11y/src/form-associated';

declare global {
  interface Window {
    spikeLog: { el: string; cb: string; value?: unknown }[];
    activeChain: () => string[];
    describeForm: (formId: string) => unknown;
  }
}

window.spikeLog = [];

/* Two composites on the disabled page each own an inner select with the same id,
   so a log key must name the owning shadow host or the two are indistinguishable
   — which is exactly the distinction the push-down causality test rests on. */
const logPath = (el: Element): string => {
  const own = el.id || el.tagName.toLowerCase();
  const root = el.getRootNode();
  const host = root instanceof ShadowRoot ? root.host : null;
  return host ? `${host.id || host.tagName.toLowerCase()}/${own}` : own;
};

const log = (el: Element, cb: string, value?: unknown) =>
  window.spikeLog.push({ el: logPath(el), cb, value });

const DIAL: Record<string, string> = { be: '+32', us: '+1', fr: '+33' };
const COUNTRIES = Object.keys(DIAL);

/* ------------------------------------------------------------------ mp-spike-select
   Stands in for the real `mp-select`: form-associated, delegatesFocus, native
   <select> inside its own shadow root, `name` attribute set by the consumer. If
   form association were NOT tree-scoped, THIS is the element that would smuggle a
   second entry into the outer form's FormData. */
export class SpikeSelect extends FormAssociatedMixin(LitElement) {
  static override styles = css`
    :host { display: inline-block; }
    select { font: inherit; }
  `;

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'disabled', 'value', 'label'];
  }

  private _value = 'be';

  get value(): string {
    return this._value;
  }
  set value(v: string) {
    this._value = v;
    this.requestUpdate();
    this.syncFormValue();
  }

  /* A property writer, exactly like Angular's setDisabledState. The mixin's
     `effectiveDisabled` must make this incapable of defeating a disabled fieldset. */
  get disabled(): boolean {
    return this.effectiveDisabled;
  }
  set disabled(v: boolean) {
    if (v) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get selectEl(): HTMLSelectElement | null {
    return this.shadowRoot?.querySelector('select') ?? null;
  }

  formValue(): string | null {
    return this._value;
  }
  formReset(): void {
    log(this, 'formReset');
    this._value = this.getAttribute('default-value') ?? 'be';
    this.requestUpdate();
  }
  formRestore(state: string | FormData | File | null): void {
    log(this, 'formRestore', String(state));
    if (typeof state === 'string') this._value = state;
    this.requestUpdate();
  }
  formValidityAnchor(): HTMLElement | null {
    return this.selectEl;
  }

  override formDisabledCallback(disabled: boolean): void {
    log(this, 'formDisabledCallback', disabled);
    super.formDisabledCallback(disabled);
  }
  override formResetCallback(): void {
    log(this, 'formResetCallback');
    super.formResetCallback();
  }
  override formStateRestoreCallback(state: string | FormData | File | null): void {
    log(this, 'formStateRestoreCallback', String(state));
    super.formStateRestoreCallback(state);
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);
    if (name === 'value' && value !== null) this._value = value;
    if (name === 'disabled') log(this, 'attributeChangedCallback:disabled', value !== null);
    this.requestUpdate();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.syncFormValue();
  }

  override render(): TemplateResult {
    return html`<select
      aria-label=${this.getAttribute('label') ?? 'Country'}
      .value=${this._value}
      ?disabled=${this.effectiveDisabled}
      @change=${(e: Event) => {
        this.value = (e.target as HTMLSelectElement).value;
        this.dispatchEvent(new CustomEvent('value-change', { detail: { value: this._value }, bubbles: true, composed: true }));
      }}
    >
      ${COUNTRIES.map((c) => html`<option value=${c} ?selected=${c === this._value}>${c.toUpperCase()} ${DIAL[c]}</option>`)}
    </select>`;
  }
}
customElements.define('mp-spike-select', SpikeSelect);

/* --------------------------------------------------- mp-spike-input-group (+ -df)
   The generic group: a shadow host whose only job is to slot the controls. Two
   variants so the spike can measure whether the MIDDLE shadow root needs
   delegatesFocus for the outer host's focus() to reach the innermost control. */
class SpikeInputGroupBase extends LitElement {
  static override styles = css`
    :host { display: flex; align-items: stretch; }
    ::slotted(*) { margin: 0; }
  `;
  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

export class SpikeInputGroup extends SpikeInputGroupBase {}
customElements.define('mp-spike-input-group', SpikeInputGroup);

export class SpikeInputGroupDf extends SpikeInputGroupBase {
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
}
customElements.define('mp-spike-input-group-df', SpikeInputGroupDf);

/* ------------------------------------------------------------- mp-spike-phone-input
   The composite under test: FACE host, delegatesFocus, shadow root holding
   <mp-spike-input-group> which slots a FACE <mp-spike-select>, a static dial-code
   <span>, and the editable <input type="tel">. The FACE value is E.164, derived on
   demand from country + national digits (PRD D7). */
class SpikePhoneInputBase extends FormAssociatedMixin(LitElement) {
  static override styles = css`
    :host { display: inline-block; }
    .dial { padding: 0 .25rem; background: #eee; display: flex; align-items: center; }
    input { font: inherit; }
  `;

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'disabled', 'required', 'country', 'value', 'autocomplete', 'inner-autocomplete'];
  }

  /** Which group element to nest — set by the two concrete subclasses. */
  protected groupTag = 'mp-spike-input-group';

  /** Set false by the `-naive` variant to prove the push-down is load-bearing. */
  protected propagateDisabled = true;

  private _country = 'be';
  private _national = '';

  get country(): string {
    return this._country;
  }
  get national(): string {
    return this._national;
  }

  get disabled(): boolean {
    return this.effectiveDisabled;
  }
  set disabled(v: boolean) {
    if (v) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get value(): string | null {
    return this.formValue();
  }

  get telInput(): HTMLInputElement | null {
    return this.shadowRoot?.querySelector('input[type=tel]') ?? null;
  }
  get innerSelect(): SpikeSelect | null {
    return this.shadowRoot?.querySelector('mp-spike-select') ?? null;
  }
  get groupEl(): HTMLElement | null {
    return this.shadowRoot?.querySelector(this.groupTag) ?? null;
  }

  formValue(): string | null {
    const digits = this._national.replace(/\D/g, '');
    return digits ? `${DIAL[this._country] ?? '+32'}${digits}` : null;
  }
  formReset(): void {
    log(this, 'formReset');
    this._national = '';
    this._country = this.getAttribute('default-country') ?? 'be';
    /* The composite drives its children explicitly — the inner FACE gets no
       formResetCallback of its own (see S5.1/S5.6). */
    const sel = this.innerSelect;
    if (sel) sel.value = this._country;
    const input = this.telInput;
    if (input) input.value = '';
    this.requestUpdate();
    this.#refreshValidity();
  }
  formRestore(state: string | FormData | File | null): void {
    log(this, 'formRestore', String(state));
    if (typeof state === 'string' && state) {
      const match = COUNTRIES.find((c) => state.startsWith(DIAL[c]));
      if (match) {
        this._country = match;
        this._national = state.slice(DIAL[match].length);
        const sel = this.innerSelect;
        if (sel) sel.value = match;
        const input = this.telInput;
        if (input) input.value = this._national;
      }
    }
    this.requestUpdate();
  }
  /** The validity anchor lives inside THIS element's shadow root (PRD §5.6). */
  formValidityAnchor(): HTMLElement | null {
    return this.telInput;
  }

  override formDisabledCallback(disabled: boolean): void {
    log(this, 'formDisabledCallback', disabled);
    super.formDisabledCallback(disabled);
    this.#pushDisabled();
  }
  override formResetCallback(): void {
    log(this, 'formResetCallback');
    super.formResetCallback();
  }
  override formStateRestoreCallback(state: string | FormData | File | null): void {
    log(this, 'formStateRestoreCallback', String(state));
    super.formStateRestoreCallback(state);
  }

  /* The outer element MUST push disabled down explicitly: the inner FACE never
     hears from the form owner, and the tel input is a plain control. Attribute,
     not property, so nothing can be defeated by a later property write. */
  #pushDisabled(): void {
    if (!this.propagateDisabled) return;
    const off = this.effectiveDisabled;
    const sel = this.innerSelect;
    if (sel) {
      if (off) sel.setAttribute('disabled', '');
      else sel.removeAttribute('disabled');
    }
    const input = this.telInput;
    if (input) input.disabled = off;
    this.requestUpdate();
  }

  #refreshValidity(): void {
    const required = this.hasAttribute('required');
    const missing = required && !this.formValue();
    this.setFormValidity(missing ? { valueMissing: true } : {}, 'Please enter a phone number.');
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);
    if (name === 'country' && value) this._country = value;
    if (name === 'disabled') {
      log(this, 'attributeChangedCallback:disabled', value !== null);
      this.#pushDisabled();
    }
    this.requestUpdate();
    if (name === 'required') this.#refreshValidity();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.syncFormValue();
  }

  override firstUpdated(): void {
    this.#pushDisabled();
    this.#refreshValidity();
  }

  override render(): TemplateResult {
    const group = this.groupTag === 'mp-spike-input-group-df'
      ? html`<mp-spike-input-group-df>${this.#contents()}</mp-spike-input-group-df>`
      : html`<mp-spike-input-group>${this.#contents()}</mp-spike-input-group>`;
    return group;
  }

  #contents(): TemplateResult {
    return html`
      <mp-spike-select
        id="inner-country"
        name=${this.getAttribute('inner-select-name') ?? 'inner-country'}
        label="Country"
        .value=${this._country}
        @value-change=${(e: CustomEvent<{ value: string }>) => {
          this._country = e.detail.value;
          this.syncFormValue();
          this.#refreshValidity();
          /* PRD D9: focus moves to the tel input after a country is chosen. */
          this.telInput?.focus();
        }}
      ></mp-spike-select>
      <span class="dial" aria-hidden="true">${DIAL[this._country]}</span>
      <input
        type="tel"
        aria-label="Phone number"
        autocomplete=${this.getAttribute('inner-autocomplete') ?? 'tel-national'}
        .value=${this._national}
        @input=${(e: Event) => {
          this._national = (e.target as HTMLInputElement).value;
          this.syncFormValue();
          this.#refreshValidity();
        }}
      />
    `;
  }
}

export class SpikePhoneInput extends SpikePhoneInputBase {}
customElements.define('mp-spike-phone-input', SpikePhoneInput);

export class SpikePhoneInputDfGroup extends SpikePhoneInputBase {
  protected override groupTag = 'mp-spike-input-group-df';
}
customElements.define('mp-spike-phone-input-dfgroup', SpikePhoneInputDfGroup);

/** The counter-example: a composite that trusts the platform to disable its
    children for it. If this stays operable inside `<fieldset disabled>`, the
    explicit push-down in the real element is mandatory, not defensive. */
export class SpikePhoneInputNaive extends SpikePhoneInputBase {
  protected override propagateDisabled = false;
}
customElements.define('mp-spike-phone-input-naive', SpikePhoneInputNaive);

/* --------------------------------------------------------------------- helpers */

/** Full activeElement chain, hopping shadow roots. */
window.activeChain = () => {
  const out: string[] = [];
  let node: Element | null = document.activeElement;
  while (node) {
    out.push(`${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}`);
    const root = (node as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
    node = root?.activeElement ?? null;
  }
  return out;
};

window.describeForm = (formId: string) => {
  const form = document.getElementById(formId) as HTMLFormElement;
  const data = new FormData(form);
  return {
    entries: [...data.entries()].map(([k, v]) => [k, String(v)]),
    elements: [...form.elements].map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}[name=${(el as HTMLInputElement).name ?? ''}]`),
    elementsLength: form.elements.length,
    checkValidity: form.checkValidity(),
  };
};
