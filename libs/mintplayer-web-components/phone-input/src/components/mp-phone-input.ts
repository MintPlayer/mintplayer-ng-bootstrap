import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// Cross-entrypoint composition, the mp-datatable idiom: a package specifier for
// types plus a bare side-effect import for registration.
import '@mintplayer/web-components/input-group';
import '@mintplayer/web-components/select';
import type { MpSelect, MpSelectOption, SelectChangeEventDetail } from '@mintplayer/web-components/select';
import {
  countryForDialString,
  loadPhoneRules,
  phoneCountryList,
  type PhoneCountryOption,
  type PhoneRules,
} from '@mintplayer/web-components/phone-core';
import { loadAllFlags, type FlagMap } from '@mintplayer/web-components/flags';
import {
  HostAriaController,
  FormAssociatedMixin,
  errorFeedback,
  errorFeedbackElements,
} from '@mintplayer/web-components/a11y';
import { formControlStyles } from '../../../_styles/form-control.styles';
import { invalidFeedbackStyles } from '../../../_styles/invalid-feedback.styles';
import { phoneInputStyles } from '../styles';
import { digitsBefore, digitsOf, indexAfterDigits, nearestDigitIndex } from './caret';

export interface PhoneChangeEventDetail {
  /** E.164 (`'+32470123456'`), or null while the input is empty. */
  value: string | null;
  country: string;
  dialCode: string;
  nationalNumber: string;
  /** `undefined` until the country's rules have loaded — honest, not optimistic. */
  valid: boolean | undefined;
}

export interface CountryChangeEventDetail {
  country: string;
  dialCode: string;
}

let instanceCounter = 0;

/** Matches the `@container (max-width: 22rem)` threshold in the stylesheet. */
const STACK_THRESHOLD_PX = 352;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * `<mp-phone-input>` — a form-associated phone-number field: country picker
 * (flag + localized name), static dial code, and a national-number input that
 * formats as the user types. The submitted/emitted value is E.164.
 *
 * Composition per the locked architecture: `mp-input-group` joining an
 * `mp-select` (the picker), a dial-code addon and an `<input type="tel">`, all
 * in this element's shadow root. The digits the user typed are the durable
 * state; country, formatting and validation rules are disposable and reload
 * around them (PRD D17) — switching country keeps the digits, reformats, and
 * re-validates, never clears or truncates.
 *
 * Everything non-obvious here is a measured spike verdict, referenced by rule:
 * caret handling D10/S7, disabled fan-out D12/S5, labelling D13/S5, autocomplete
 * D14/S5, `+XX` detection D11/S8, formatting route D6b/F1, per-calling-code
 * rules D6a-alt/S9, flags in the addon rather than S2's overlay (see
 * `phone-input.styles.scss`).
 *
 * Tier: JS-only (no no-JS tier, no DSD chrome — and that is load-bearing for
 * `Intl.DisplayNames` hydration safety, PRD §5.7).
 */
export class MpPhoneInput extends FormAssociatedMixin(LitElement) {
  static override styles = [formControlStyles, invalidFeedbackStyles, phoneInputStyles];

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'country',
      'value',
      'default-country',
      'locale',
      'preferred-countries',
      'allowed-countries',
      'disabled',
      'required',
      'invalid',
      'placeholder',
      'autocomplete',
      'input-label',
      'country-label',
      'error-text',
      'aria-label',
      'aria-labelledby',
      'aria-describedby',
    ];
  }

  private _country: string | null = null;
  private _digits = '';
  private _rules: PhoneRules | undefined;
  /** Rules are fetched lazily; nothing loads until the field is interacted with
   *  or receives a non-empty initial value. */
  private _rulesWanted = false;
  private _locale: string | null = null;
  private _preferred: string[] = [];
  private _only: string[] | null = null;
  private _placeholder: string | null = null;
  private _autocomplete = 'tel-national';
  private _inputLabel: string | null = null;
  private _countryLabel: string | null = null;
  private _errorText: string | null = null;
  private readonly _errorId = `mp-phone-input-${++instanceCounter}-error`;
  private readonly _dialId = `mp-phone-input-${instanceCounter}-dial`;
  private _list: readonly PhoneCountryOption[] = [];
  private _listKey = '';
  /** Resolved corpus, or `undefined` until the one flag chunk lands (D4a). */
  private _flags: FlagMap | undefined;
  private _flagsRequested = false;
  #stackObserver: ResizeObserver | undefined;
  private _composing = false;
  private _preEdit: { value: string; start: number } | null = null;
  private readonly _inputRef: Ref<HTMLInputElement> = createRef();
  private readonly _selectRef: Ref<MpSelect> = createRef();

  private readonly hostAria = new HostAriaController(this, {
    referenceTarget: () => this._inputRef.value ?? null,
    describedByExtras: () => errorFeedbackElements(this.renderRoot),
  });

  // ---- public surface -------------------------------------------------------

  /** Selected ISO 3166-1 alpha-2 country, lowercase. */
  get country(): string {
    return this._country ?? this.getAttribute('default-country')?.toLowerCase() ?? this.countryList()[0]?.iso2 ?? '';
  }
  set country(value: string) {
    this.#setCountry(value?.trim().toLowerCase() ?? '', { fromUser: false });
  }

  /** E.164, derived from country + digits; null while empty. */
  get value(): string | null {
    if (!this._digits) return null;
    // The parser owns E.164 (PRD D6c — a string rule cannot tell RU's trunk
    // prefix from a significant digit). Until rules resolve, the naive join is
    // the best available answer and is flagged by `valid: undefined`.
    return this._rules?.toE164(this._digits) ?? `+${this.dialCode}${this._digits}`;
  }
  set value(next: string | null) {
    const raw = next?.trim() ?? '';
    if (!raw) {
      this._digits = '';
      this.requestUpdate();
      return;
    }
    const match = countryForDialString(raw, this._only ?? undefined);
    if (match) {
      this._digits = match.nationalNumber;
      this.#setCountry(match.country.iso2, { fromUser: false });
    } else {
      this._digits = digitsOf(raw);
    }
    if (this._digits) this.#wantRules();
    this.requestUpdate();
  }

  get dialCode(): string {
    return this.countryList().find((c) => c.iso2 === this.country)?.dialCode ?? '';
  }

  /** The national digits as typed — the durable state (PRD D17). */
  get nationalNumber(): string {
    return this._digits;
  }

  /** `undefined` until the selected country's rules have loaded. */
  get valid(): boolean | undefined {
    return this._rules && this._rules.country === this.country ? this._rules.isValid(this._digits) : undefined;
  }

  /**
   * Property mirrors for the attribute-only options.
   *
   * Not decoration: `@lit/react` derives a React component's prop types from the
   * element's PROPERTIES, so an option with no accessor is unreachable from JSX
   * except as an untyped attribute — and array-valued options (`preferred`,
   * `allowed`) cannot be expressed as attributes from JS at all without the
   * caller joining them by hand. Setters take an array or a comma-separated
   * string; attributes stay the source of truth for HTML/SSR consumers.
   */
  get defaultCountry(): string | null {
    return this.getAttribute('default-country');
  }
  set defaultCountry(value: string | null) {
    if (value == null) this.removeAttribute('default-country');
    else this.setAttribute('default-country', value.trim().toLowerCase());
  }

  get locale(): string | null {
    return this._locale;
  }
  set locale(value: string | null) {
    if (this._locale === (value ?? null)) return;
    this._locale = value ?? null;
    this.requestUpdate();
  }

  get preferredCountries(): string[] {
    return [...this._preferred];
  }
  set preferredCountries(value: readonly string[] | string | null) {
    this._preferred = MpPhoneInput.#codes(value);
    this.requestUpdate();
  }

  get allowedCountries(): string[] | null {
    return this._only ? [...this._only] : null;
  }
  set allowedCountries(value: readonly string[] | string | null) {
    const codes = MpPhoneInput.#codes(value);
    this._only = codes.length ? codes : null;
    this.requestUpdate();
  }

  get placeholder(): string | null {
    return this._placeholder;
  }
  set placeholder(value: string | null) {
    this._placeholder = value ?? null;
    this.requestUpdate();
  }

  get autocomplete(): string {
    return this._autocomplete;
  }
  set autocomplete(value: string | null) {
    this._autocomplete = value ?? 'tel-national';
    this.requestUpdate();
  }

  get inputLabel(): string | null {
    return this._inputLabel;
  }
  set inputLabel(value: string | null) {
    this._inputLabel = value ?? null;
    this.requestUpdate();
  }

  get countryLabel(): string | null {
    return this._countryLabel;
  }
  set countryLabel(value: string | null) {
    this._countryLabel = value ?? null;
    this.requestUpdate();
  }

  get errorText(): string | null {
    return this._errorText;
  }
  set errorText(value: string | null) {
    this._errorText = value ?? null;
    this.requestUpdate();
  }

  static #codes(value: readonly string[] | string | null): string[] {
    const list = typeof value === 'string' ? value.split(',') : (value ?? []);
    return list.map((code) => code.trim().toLowerCase()).filter(Boolean);
  }

  get disabled(): boolean {
    return this.effectiveDisabled;
  }
  set disabled(next: boolean) {
    this.toggleAttribute('disabled', !!next);
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'country':
        if (newValue) this.#setCountry(newValue.toLowerCase(), { fromUser: false });
        break;
      case 'value':
        this.value = newValue;
        break;
      case 'locale':
        this._locale = newValue;
        this.requestUpdate();
        break;
      case 'preferred-countries':
        this._preferred = (newValue ?? '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
        this.requestUpdate();
        break;
      // Named `allowed-countries`, not intl-tel-input's `onlyCountries`: Angular
      // refuses to bind ANY attribute whose name starts with `on` (it parses as an
      // event attribute — `on` + `ly-countries`), so `[attr.only-countries]` is a
      // hard template error for every Angular consumer of this element.
      case 'allowed-countries':
        this._only = newValue ? newValue.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean) : null;
        this.requestUpdate();
        break;
      case 'placeholder':
        this._placeholder = newValue;
        this.requestUpdate();
        break;
      case 'autocomplete':
        // D14: the host has no autocomplete IDL and the UA does no plumbing into
        // a shadow root — the element must forward it onto the inner tel input.
        this._autocomplete = newValue ?? 'tel-national';
        this.requestUpdate();
        break;
      case 'input-label':
        this._inputLabel = newValue;
        this.requestUpdate();
        break;
      case 'country-label':
        this._countryLabel = newValue;
        this.requestUpdate();
        break;
      case 'error-text':
        this._errorText = newValue;
        this.requestUpdate();
        break;
      case 'disabled':
      case 'required':
      case 'invalid':
      case 'default-country':
      case 'aria-label':
        this.requestUpdate();
        break;
      case 'aria-labelledby':
      case 'aria-describedby':
        this.hostAria.syncReferences();
        break;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#wantFlags();
    if (this._digits) this.#wantRules();

    // The group pairs corners vertically only when told to, and CSS cannot set an
    // attribute — so the one thing the container query cannot do itself is done
    // here. Threshold matches the @container rule in this element's stylesheet.
    //
    // Feature-detected, following mp-carousel/mp-datatable/mp-ribbon-tab: without
    // ResizeObserver (jsdom, an old engine, a Node SSR pass) the element must lose
    // only the stacked layout, not throw on connect. It threw in the React
    // wrapper library's test environment, which does not polyfill it.
    if (typeof ResizeObserver !== 'undefined') {
      this.#stackObserver ??= new ResizeObserver((entries) => {
        const width = entries[entries.length - 1]?.contentRect.width ?? 0;
        const stacked = width > 0 && width <= STACK_THRESHOLD_PX;
        const group = this.renderRoot?.querySelector('mp-input-group');
        group?.toggleAttribute('stacked', stacked);
      });
      this.#stackObserver.observe(this);
    }
  }



  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stackObserver?.disconnect();
    this.#stackObserver = undefined;
  }

  // ---- rendering ------------------------------------------------------------

  override render(): TemplateResult {
    const country = this.country;
    const dial = this.dialCode;
    const disabled = this.effectiveDisabled;
    const invalid = this.hasAttribute('invalid');
    const error = errorFeedback(this._errorId, this._errorText, invalid);
    // Composed by hand rather than bound as `"${dial} ${error.id}"`: error.id is
    // `nothing` while valid, and `nothing` in ANY part of a multi-part attribute
    // binding removes the WHOLE attribute — which silently dropped the dial-code
    // description exactly when the control was healthy.
    const describedBy = typeof error.id === 'string' ? `${this._dialId} ${error.id}` : this._dialId;
    const ariaLabel = this.getAttribute('aria-label') ?? this._inputLabel ?? 'Phone number';
    const flag = this._flags?.[country];

    return html`
      <mp-input-group>
        <mp-select
          ${ref(this._selectRef)}
          input-label=${this._countryLabel ?? 'Country'}
          ?disabled=${disabled}
          .options=${this.selectOptions()}
          .optionRenderer=${this.renderCountryOption}
          .value=${country}
          @value-change=${this.onCountryPicked}
        ></mp-select>
        <span class="addon" id=${this._dialId}>
          <!-- Always rendered; the stylesheet hides it when the picker's own closed
               face already shows a flag, using a sibling selector on the select's
               reflected rich state. That state is NOT the same condition as the
               base-select @supports query — rich mode also needs a renderer,
               options mode and a plain dropdown — which is why keying the CSS off
               @supports left a supporting engine with no flag anywhere whenever
               rich was suppressed for another reason (PRD 12.2). -->
          <span class="flag" aria-hidden="true">${flag ? unsafeHTML(flag) : nothing}</span>
          <!-- dir=ltr is required, not cosmetic: the plus sign is bidi-neutral, so
               in an RTL paragraph direction it reorders to the trailing position and
               the dial code renders as 32+ (measured at any width, PRD 12.6). A
               calling code is a left-to-right technical token in every script. -->
          <span class="dial-code" dir="ltr">+${dial}</span>
        </span>
        <input
          ${ref(this._inputRef)}
          type="tel"
          class="form-control"
          inputmode="tel"
          autocomplete=${this._autocomplete}
          placeholder=${this._placeholder ?? nothing}
          ?disabled=${disabled}
          aria-label=${ariaLabel}
          aria-invalid=${invalid ? 'true' : nothing}
          aria-required=${this.hasAttribute('required') ? 'true' : nothing}
          aria-errormessage=${error.id}
          aria-describedby=${describedBy}
          @beforeinput=${this.onBeforeInput}
          @keydown=${this.onKeydown}
          @input=${this.onInput}
          @focus=${this.onFocus}
          @compositionstart=${this.onCompositionStart}
          @compositionend=${this.onCompositionEnd}
        />
      </mp-input-group>
      ${error.node}
    `;
  }

  protected override updated(): void {
    // Element references bind to a node; the input is not guaranteed to be the
    // same node after a re-render (the mp-select lesson).
    this.hostAria.syncReferences();


    const input = this._inputRef.value;
    if (input && !this._composing) {
      const formatted = this.formatted(this._digits);
      if (input.value !== formatted) input.value = formatted;
    }

    this.syncFormValue();
    const missing = this.hasAttribute('required') && !this._digits;
    const known = this.valid;
    this.setFormValidity(
      { valueMissing: missing, customError: known === false },
      missing ? 'Please enter a phone number.' : 'Please enter a valid phone number.',
    );
  }

  private selectOptions(): MpSelectOption[] {
    return this.countryList().map((c) => ({
      value: c.iso2,
      // Name FIRST: native typeahead prefix-matches the option text, and
      // ISO-first makes country names unreachable by typing (S2, all engines).
      label: `${c.name} +${c.dialCode} (${c.iso2.toUpperCase()})`,
    }));
  }

  /**
   * Rich option: flag + name + dial in the list, flag + ISO on the closed face
   * (the `data-*-only` hooks in mp-select's stylesheet). The flag is decorative;
   * the option's accessible name stays `name +dial`.
   */
  private renderCountryOption = (option: MpSelectOption): string | undefined => {
    const country = this.countryList().find((c) => c.iso2 === option.value);
    if (!country) return undefined;
    const flag = this._flags?.[country.iso2];
    return (
      `<span class="flag-box" aria-hidden="true">${flag ?? ''}</span>` +
      `<span class="rich-label" data-list-only>${escapeHtml(country.name)}</span>` +
      `<span data-list-only>+${country.dialCode}</span>` +
      `<span data-closed-only>${country.iso2.toUpperCase()}</span>`
    );
  };

  private countryList(): readonly PhoneCountryOption[] {
    const key = `${this._locale ?? ''}|${this._preferred.join()}|${this._only?.join() ?? '*'}`;
    if (key !== this._listKey) {
      this._list = phoneCountryList({
        locale: this._locale ?? undefined,
        preferred: this._preferred,
        only: this._only ?? undefined,
      });
      this._listKey = key;
    }
    return this._list;
  }

  private formatted(digits: string): string {
    return this._rules && this._rules.country === this.country ? this._rules.format(digits) : digits;
  }

  // ---- country + rules ------------------------------------------------------

  #setCountry(iso2: string, { fromUser }: { fromUser: boolean }): void {
    if (!iso2 || iso2 === this._country) return;
    this._country = iso2;
    // Reflected for CSS/e2e; `value` deliberately is not (it changes per keystroke).
    if (this.getAttribute('country') !== iso2) this.setAttribute('country', iso2);
    this._rules = this._rules?.country === iso2 ? this._rules : undefined;
    if (this._rulesWanted) this.#loadRules(iso2);
    this.#wantFlags();
    if (fromUser) {
      this.dispatchEvent(
        new CustomEvent<CountryChangeEventDetail>('country-change', {
          detail: { country: iso2, dialCode: this.dialCode },
          bubbles: true,
          composed: true,
        }),
      );
    }
    this.requestUpdate();
  }

  #wantRules(): void {
    if (this._rulesWanted) return;
    this._rulesWanted = true;
    this.#loadRules(this.country);
  }

  #loadRules(iso2: string): void {
    void loadPhoneRules(iso2).then((rules) => {
      // A stale resolution (country changed while the chunk was in flight) must
      // not install the wrong country's rules.
      if (!rules || this.country !== iso2) return;
      this._rules = rules;
      // D17's async gap closes here: reformat what is already typed and
      // re-validate; the caret is safe because it anchors on digit count.
      this.requestUpdate();
      this.#emitChange();
    });
  }

  private onCountryPicked = (ev: CustomEvent<SelectChangeEventDetail>): void => {
    ev.stopPropagation();
    const iso2 = ev.detail.value;
    if (!iso2) return;
    this.#setCountry(iso2, { fromUser: true });
    this.#wantRules();
    // D9: focus moves to the number field after choosing a country.
    this._inputRef.value?.focus();
    this.#emitChange();
  };

  /**
   * Fetch the flag corpus, once per element, as early as the element knows it
   * will draw a flag — which is at mount, since the addon shows the selected
   * country's flag before any interaction.
   *
   * One chunk for all 244 (D4a): the picker needs every flag the moment it opens,
   * so warming per-flag chunks made the selected flag queue behind up to 243
   * siblings and the list fill in over 3.2 s on HTTP/1.1. Everything arrives in
   * one resolution, so a single `requestUpdate()` renders the addon flag and all
   * 244 options together — no partial-fill pass, and no re-render per flag.
   */
  #wantFlags(): void {
    if (this._flagsRequested) return;
    this._flagsRequested = true;
    void loadAllFlags().then((flags) => {
      this._flags = flags;
      this.requestUpdate();
    });
  }

  // ---- typing (PRD D10 — every rule is a measured S7 verdict) ----------------

  private onFocus = (): void => {
    this.#wantRules();
  };

  private onCompositionStart = (): void => {
    this._composing = true;
  };

  private onCompositionEnd = (): void => {
    // Rule 5: never rewrite the value mid-composition; reformat exactly once here.
    this._composing = false;
    const input = this._inputRef.value;
    if (input) this.#commitRaw(input, input.value, input.selectionStart ?? input.value.length);
  };

  private onBeforeInput = (): void => {
    // Rule 2: the pre-edit caret is only observable now.
    const input = this._inputRef.value;
    if (input) this._preEdit = { value: input.value, start: input.selectionStart ?? 0 };
  };

  private onKeydown = (ev: KeyboardEvent): void => {
    // Rule 4: Backspace/Delete must always remove a DIGIT. If the character in
    // the direction of travel is a separator, the browser would delete it and the
    // reformat would put it straight back — one keypress, nothing happens.
    if (ev.key !== 'Backspace' && ev.key !== 'Delete') return;
    const input = this._inputRef.value;
    if (!input || input.selectionStart !== input.selectionEnd) return; // ranges contain digits
    const caret = input.selectionStart ?? 0;
    const direction = ev.key === 'Backspace' ? -1 : 1;
    const adjacent = direction === -1 ? input.value[caret - 1] : input.value[caret];
    if (adjacent === undefined || /\d/.test(adjacent)) return;

    ev.preventDefault();
    const digitIndex = nearestDigitIndex(input.value, caret, direction);
    if (digitIndex === -1) return;
    const k = digitsBefore(input.value, digitIndex);
    const digits = digitsOf(input.value);
    this.#commitDigits(input, digits.slice(0, k) + digits.slice(k + 1), k);
  };

  private onInput = (): void => {
    const input = this._inputRef.value;
    if (!input || this._composing) return;
    this.#commitRaw(input, input.value, input.selectionStart ?? input.value.length);
  };

  #commitRaw(input: HTMLInputElement, raw: string, caretRaw: number): void {
    // D11: an international-looking entry (paste or typed `+XX`/`00XX`) resolves
    // through the eager table — libphonenumber cannot name a country until the
    // number is VALID, which is exactly too late for a flag that should follow
    // the typing. A dial code compatible with the current country never switches
    // it (D5a: detection must not overwrite an explicit choice among siblings).
    const match = countryForDialString(raw, this._only ?? undefined);
    if (match) {
      if (match.dialCode !== this.dialCode) this.#setCountry(match.country.iso2, { fromUser: true });
      this.#wantRules();
      this.#commitDigits(input, match.nationalNumber, digitsOf(match.nationalNumber).length);
      return;
    }

    const digits = digitsOf(raw);
    const pre = this._preEdit;

    // Rule 3: a rejected non-digit RESTORES the pre-edit state — recomputing from
    // the polluted string drifts the caret (measured: one letter, off by one).
    if (pre && digits === digitsOf(pre.value) && raw !== pre.value) {
      input.value = pre.value;
      input.setSelectionRange(pre.start, pre.start);
      return;
    }

    // Rule 7: reject a single typed digit that makes the number too long —
    // past the last legal length AsYouType matches no pattern and the display
    // visibly DE-formats mid-typing. Pastes pass through and read as invalid.
    if (
      pre &&
      this._rules &&
      digits.length === digitsOf(pre.value).length + 1 &&
      this._rules.lengthProblem(digits) === 'TOO_LONG' &&
      this._rules.lengthProblem(digitsOf(pre.value)) !== 'TOO_LONG'
    ) {
      const formatted = this.formatted(digitsOf(pre.value));
      input.value = formatted;
      input.setSelectionRange(pre.start, pre.start);
      return;
    }

    this.#commitDigits(input, digits, digitsBefore(raw, caretRaw));
  }

  /** Rule 1: place the caret after the same DIGIT COUNT in the new formatting. */
  #commitDigits(input: HTMLInputElement, digits: string, caretDigits: number): void {
    this._digits = digits;
    const formatted = this.formatted(digits);
    input.value = formatted;
    const caret = indexAfterDigits(formatted, caretDigits);
    input.setSelectionRange(caret, caret);
    this._preEdit = { value: formatted, start: caret };
    // Rule 6, by construction: this path IS the value/validity path — updated()
    // re-runs syncFormValue/setFormValidity, and the change event goes out below.
    this.requestUpdate();
    this.#emitChange();
  }

  #emitChange(): void {
    this.dispatchEvent(
      new CustomEvent<PhoneChangeEventDetail>('value-change', {
        detail: {
          value: this.value,
          country: this.country,
          dialCode: this.dialCode,
          nationalNumber: this._digits,
          valid: this.valid,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ---- form association ------------------------------------------------------

  formValue(): string | null {
    return this.value;
  }

  formReset(): void {
    this._digits = '';
    this._country = null;
    this.requestUpdate();
  }

  /** D15: a real back-navigation restores E.164 — decompose it, drive both children. */
  formRestore(state: string | FormData | File | null): void {
    if (typeof state === 'string') this.value = state;
  }

  formValidityAnchor(): HTMLElement | null {
    return this._inputRef.value ?? null;
  }

  override focus(options?: FocusOptions): void {
    // D13: delegatesFocus alone would land on the first focusable — the country
    // select. The value control is the tel input; a host focus() goes there.
    this._inputRef.value?.focus(options);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-phone-input')) {
  customElements.define('mp-phone-input', MpPhoneInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-phone-input': MpPhoneInput;
  }
}
