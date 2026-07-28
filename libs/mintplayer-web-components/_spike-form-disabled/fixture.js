/* Spike 0.3a fixture — the PLATFORM half of the two-writers-on-`disabled` hazard.
   The repo has already been bitten by this once (otp-input.component.ts:124-131).
   The Angular CVA half is spike 0.3b; what matters first is knowing exactly WHEN
   the UA calls formDisabledCallback, because the single-source-of-truth design
   depends on it. */

window.callbackLog = [];

class FaceCheckbox extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() {
    return ['disabled'];
  }

  /* The single source of truth. Both writers funnel into this. */
  #disabled = false;
  /* Set while the UA-driven path is applying, so a reflecting write cannot be
     mistaken for a consumer write and bounce back. */
  #applyingFromForm = false;

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.attachShadow({ mode: 'open' }).innerHTML = `<button part="box" type="button">box</button>`;
  }

  get disabled() {
    return this.#disabled;
  }
  set disabled(value) {
    const next = !!value;
    if (next === this.#disabled) return;
    this.#disabled = next;
    window.callbackLog.push({ source: 'property-setter', value: next });
    this.#render();
  }

  attributeChangedCallback(name, _old, value) {
    if (name !== 'disabled') return;
    window.callbackLog.push({ source: 'attributeChangedCallback', value: value !== null });
    if (this.#applyingFromForm) return;
    this.disabled = value !== null;
  }

  /* Called by the UA when the element's disabled state changes because of its
     form owner — most importantly an ancestor <fieldset disabled>. */
  formDisabledCallback(isDisabled) {
    window.callbackLog.push({ source: 'formDisabledCallback', value: isDisabled });
    this.#applyingFromForm = true;
    this.#disabled = isDisabled;
    this.#render();
    this.#applyingFromForm = false;
  }

  #render() {
    const button = this.shadowRoot.querySelector('button');
    button.disabled = this.#disabled;
    this.internals.ariaDisabled = String(this.#disabled);
  }

  /** What a screen reader would see, and what the inner control really is. */
  state() {
    return {
      privateDisabled: this.#disabled,
      hasAttribute: this.hasAttribute('disabled'),
      ariaDisabled: this.internals.ariaDisabled,
      innerButtonDisabled: this.shadowRoot.querySelector('button').disabled,
    };
  }
}
customElements.define('mp-face-checkbox', FaceCheckbox);
