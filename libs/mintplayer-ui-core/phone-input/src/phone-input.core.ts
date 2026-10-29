import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { loadAllFlags, type FlagMap } from '@mintplayer/ui-core/flags';
import { countryForDialString, loadPhoneRules, type PhoneRules } from '@mintplayer/ui-core/phone-core';
import { supportsBaseSelect } from '@mintplayer/ui-core/select';
import { digitsBefore, digitsOf, indexAfterDigits, nearestDigitIndex } from './caret';
import {
  connectPhoneInput,
  countryCodes,
  formatDigits,
  phoneValid,
  phoneValue,
  pickerCountries,
  rulesFor,
  type PhoneChangeEventDetail,
  type PhoneInputView,
} from './phone-input';

/**
 * The phone input's core (PRD #437 D10): what the generated Angular, React, Vue
 * and Lit components host. `phone-input.component.ts` is its manifest and
 * `templates/phone-input.view.vue` its markup.
 *
 * Every typing rule below is a measured spike verdict of the field's own PRD
 * (docs/prd/phone-input-wc.md), referenced by number: caret handling D10/S7,
 * `+XX` detection D11/S8, rules that load lazily around the digits D17.
 */

export interface PhoneInputInputs {
  /** E.164 (`'+32470123456'`), or null while empty. Written through as the user types. */
  value: string | null;
  /** Selected ISO 3166-1 alpha-2 country, lowercase. Written through when the user picks one. */
  country: string | null;
  /** The country shown until one is picked or detected; else the first of the list. */
  defaultCountry?: string | null;
  /** Locale of the country names (default: the browser's). */
  locale?: string | null;
  /** Countries listed first, as an array or a comma-separated string. */
  preferredCountries: readonly string[] | string | null;
  /** The only countries offered, as an array or a comma-separated string; empty means all. */
  allowedCountries: readonly string[] | string | null;
  disabled: boolean;
  required: boolean;
  /** Marks the field invalid and shows `errorText` under it. */
  invalid: boolean;
  /** The validation message, referenced from the tel input while `invalid`. */
  errorText?: string | null;
  placeholder?: string | null;
  /** The tel input's autocomplete token (default `tel-national`). */
  autocomplete: string;
  /** Submitted with the form: the E.164 value (the typed text with JavaScript off). */
  name?: string | null;
  /** Accessible name of the tel input (default "Phone number"); an `aria-label` on the component wins. */
  inputLabel?: string | null;
  /** Accessible name of the country picker (default "Country"). */
  countryLabel?: string | null;
}

export interface PhoneInputState {
  value: string | null;
  /** The picked, detected or written country; null falls back to `defaultCountry`. */
  country: string | null;
  /** The national digits as typed: the durable state (D17). */
  digits: string;
  rules: PhoneRules | undefined;
  /** The flag corpus, once its one chunk has landed (D4a). */
  flags: FlagMap | undefined;
}

export interface PhoneInputEvents {
  /** The E.164 value changed (null while empty). */
  valueChange: string | null;
  /** The user picked a country, or typed a `+XX` that switched it. */
  countryChange: string;
  /** Every edit, pick and rules load: the value with its parts and validity. */
  phoneChange: PhoneChangeEventDetail;
}

export interface PhoneInputMethods {
  /** Move focus into the number field (not the country picker). */
  focusInput(options?: FocusOptions): void;
  /** Settles once the flags and the selected country's rules in flight have been applied. */
  whenReady(): Promise<void>;
}

type Api = CoreApi<PhoneInputInputs, PhoneInputState, PhoneInputEvents>;

const INVALID_MESSAGE = 'Please enter a valid phone number.';

interface Runtime {
  rulesWanted: boolean;
  pending: Promise<void>;
  flags: Promise<unknown>;
  composing: boolean;
  preEdit: { value: string; start: number } | null;
}

/** Per mounted field: the core object is shared by every instance. */
const runtimes = new WeakMap<HTMLElement, Runtime>();
const runtime = (api: Api): Runtime => {
  let rt = runtimes.get(api.host);
  if (!rt) {
    rt = { rulesWanted: false, pending: Promise.resolve(), flags: Promise.resolve(), composing: false, preEdit: null };
    runtimes.set(api.host, rt);
  }
  return rt;
};

const allowed = (inputs: PhoneInputInputs) => {
  const codes = countryCodes(inputs.allowedCountries);
  return codes.length ? codes : null;
};

/** The listed countries in the given locale. */
const countriesOf = (inputs: PhoneInputInputs, locale: string | null) =>
  pickerCountries(locale, countryCodes(inputs.preferredCountries), allowed(inputs));

/**
 * The selected country. The fallback reads a fixed-locale list, so the server
 * and the browser agree on it whatever their languages (the list is sorted by
 * localized name).
 */
function effectiveCountry(inputs: PhoneInputInputs, state: PhoneInputState): string {
  return state.country ?? inputs.defaultCountry?.trim().toLowerCase() ?? countriesOf(inputs, 'en')[0]?.iso2 ?? '';
}

const countryOf = (api: Api) => effectiveCountry(api.inputs(), api.state());
const dialCodeOf = (api: Api, iso2 = countryOf(api)) => countriesOf(api.inputs(), 'en').find((c) => c.iso2 === iso2)?.dialCode ?? '';
const field = (api: Api) => api.host.querySelector('input[type=tel]') as HTMLInputElement;
const picker = (api: Api) => api.host.querySelector('select') as HTMLSelectElement;

/**
 * Keeps the closed face showing the selected option. `<selectedcontent>` is a
 * snapshot the browser takes when the selection changes, and Chromium does not
 * re-take it when that option's content changes later. Ours always does: the
 * rich spans arrive with hydration and the flags with their lazy chunk, after
 * the server-rendered selection, so the face showed a country with no flag.
 * Re-selecting the same option re-takes the snapshot (a scripted selection
 * fires no event). The snapshot's own mutations are ignored, so a clone that
 * serialises differently from its option can never make the observer echo.
 */
function syncSelectedContent(select: HTMLSelectElement): () => void {
  const refresh = () => {
    const option = select.selectedOptions[0];
    const face = select.querySelector('selectedcontent');
    if (!option || !face || face.innerHTML === option.innerHTML) return;
    const index = select.selectedIndex;
    select.selectedIndex = -1;
    select.selectedIndex = index;
  };
  const inFace = (node: Node) => (node instanceof Element ? node : node.parentElement)?.closest('selectedcontent') != null;
  const observer = new MutationObserver((records) => {
    if (records.some((record) => !inFace(record.target))) refresh();
  });
  observer.observe(select, { childList: true, subtree: true, characterData: true });
  refresh();
  return () => observer.disconnect();
}

/** Parse a written value into country + national digits. */
function parse(raw: string | null | undefined, only: readonly string[] | null): { digits: string; country: string | null } {
  const text = raw?.trim() ?? '';
  if (!text) return { digits: '', country: null };
  const match = countryForDialString(text, only ?? undefined);
  return match ? { digits: match.nationalNumber, country: match.country.iso2 } : { digits: digitsOf(text), country: null };
}

/** Show the digits in the current country's format, and keep the picker and validity in step. */
function show(api: Api) {
  const { digits, rules } = api.state();
  const country = countryOf(api);
  const input = field(api);
  const select = picker(api);
  if (select && select.value !== country) select.value = country;
  if (!input) return;
  if (!runtime(api).composing) {
    const formatted = formatDigits(rules, country, digits);
    if (input.value !== formatted) input.value = formatted;
  }
  input.setCustomValidity(phoneValid(rules, country, digits) === false ? INVALID_MESSAGE : '');
}

/** Report the current number: `valueChange` when the E.164 moved, `phoneChange` always. */
function publish(api: Api) {
  const { digits, rules } = api.state();
  const country = countryOf(api);
  const dialCode = dialCodeOf(api, country);
  const value = phoneValue(rules, country, dialCode, digits);
  if (value !== api.state().value) {
    api.setState({ value });
    api.emit('valueChange', value);
  }
  api.emit('phoneChange', { value, country, dialCode, nationalNumber: digits, valid: phoneValid(rules, country, digits) });
}

function loadRules(api: Api, iso2: string) {
  const rt = runtime(api);
  rt.pending = loadPhoneRules(iso2).then((rules) => {
    // A stale resolution (the country changed while the chunk was in flight)
    // must not install the wrong country's rules.
    if (!rules || countryOf(api) !== iso2) return;
    api.setState({ rules });
    // D17's async gap closes here: reformat what is already typed and
    // re-validate; the caret is safe because it anchors on digit count.
    show(api);
    publish(api);
  });
}

/** Rules are fetched lazily: not until the field is focused or holds digits. */
function wantRules(api: Api) {
  const rt = runtime(api);
  if (rt.rulesWanted) return;
  rt.rulesWanted = true;
  loadRules(api, countryOf(api));
}

function setCountry(api: Api, iso2: string, fromUser: boolean) {
  if (!iso2 || iso2 === countryOf(api)) return;
  api.setState({ country: iso2, rules: rulesFor(api.state().rules, iso2) });
  if (runtime(api).rulesWanted) loadRules(api, iso2);
  show(api);
  if (fromUser) api.emit('countryChange', iso2);
}

/** Rule 1: place the caret after the same DIGIT COUNT in the new formatting. */
function commitDigits(api: Api, input: HTMLInputElement, digits: string, caretDigits: number) {
  api.setState({ digits });
  const formatted = formatDigits(api.state().rules, countryOf(api), digits);
  input.value = formatted;
  const caret = indexAfterDigits(formatted, caretDigits);
  input.setSelectionRange(caret, caret);
  runtime(api).preEdit = { value: formatted, start: caret };
  show(api);
  publish(api);
}

function commitRaw(api: Api, input: HTMLInputElement, raw: string, caretRaw: number) {
  const only = allowed(api.inputs());
  // D11: an international-looking entry (paste or typed `+XX`/`00XX`) resolves
  // through the eager table: libphonenumber cannot name a country until the
  // number is VALID, too late for a flag that should follow the typing. A dial
  // code compatible with the current country never switches it (D5a).
  const match = countryForDialString(raw, only ?? undefined);
  if (match) {
    if (match.dialCode !== dialCodeOf(api)) setCountry(api, match.country.iso2, true);
    wantRules(api);
    commitDigits(api, input, match.nationalNumber, digitsOf(match.nationalNumber).length);
    return;
  }

  const digits = digitsOf(raw);
  const pre = runtime(api).preEdit;
  const rules = rulesFor(api.state().rules, countryOf(api));

  // Rule 3: a rejected non-digit RESTORES the pre-edit state; recomputing from
  // the polluted string drifts the caret (measured: one letter, off by one).
  if (pre && digits === digitsOf(pre.value) && raw !== pre.value) {
    input.value = pre.value;
    input.setSelectionRange(pre.start, pre.start);
    return;
  }

  // Rule 7: reject a single typed digit that makes the number too long. Past
  // the last legal length AsYouType matches no pattern and the display visibly
  // DE-formats mid-typing. Pastes pass through and read as invalid.
  if (
    pre &&
    rules &&
    digits.length === digitsOf(pre.value).length + 1 &&
    rules.lengthProblem(digits) === 'TOO_LONG' &&
    rules.lengthProblem(digitsOf(pre.value)) !== 'TOO_LONG'
  ) {
    input.value = rules.format(digitsOf(pre.value));
    input.setSelectionRange(pre.start, pre.start);
    return;
  }

  commitDigits(api, input, digits, digitsBefore(raw, caretRaw));
}

/** A value written by the consumer: shown, never reported back as a change. */
function writeValue(api: Api, next: string | null) {
  const { digits, country } = parse(next, allowed(api.inputs()));
  api.setState({ digits });
  if (country) setCountry(api, country, false);
  if (digits) wantRules(api);
  const { rules } = api.state();
  const iso2 = countryOf(api);
  api.setState({ value: phoneValue(rules, iso2, dialCodeOf(api, iso2), digits) });
  show(api);
}

export const phoneInputCore = defineCore<PhoneInputInputs, PhoneInputState, { view: PhoneInputView }, PhoneInputEvents, undefined, undefined, PhoneInputMethods>({
  state: (inputs) => {
    const parsed = parse(inputs.value, allowed(inputs));
    return {
      value: inputs.value?.trim() || null,
      country: parsed.country ?? (inputs.country?.trim().toLowerCase() || null),
      digits: parsed.digits,
      rules: undefined,
      flags: undefined,
    };
  },
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectPhoneInput({
      id,
      // Country names come from Intl.DisplayNames: a fixed locale until hydrated,
      // so the server's language can never mismatch the browser's (PRD §5.7).
      countries: countriesOf(inputs, inputs.locale ?? (hydrated ? null : 'en')),
      country: effectiveCountry(inputs, state),
      digits: state.digits,
      rules: state.rules,
      flags: state.flags,
      disabled: inputs.disabled,
      required: inputs.required,
      invalid: inputs.invalid,
      errorText: inputs.errorText ?? null,
      placeholder: inputs.placeholder ?? null,
      autocomplete: inputs.autocomplete || 'tel-national',
      name: inputs.name ?? null,
      label: label ?? inputs.inputLabel ?? null,
      countryLabel: inputs.countryLabel ?? null,
      hydrated,
      rich: hydrated && supportsBaseSelect(),
    }),
  }),
  attach: (api) => {
    const rt = runtime(api);
    const input = field(api);
    const select = picker(api);

    const onFocus = () => wantRules(api);
    const onCompositionStart = () => {
      rt.composing = true;
    };
    const onCompositionEnd = () => {
      // Rule 5: never rewrite the value mid-composition; reformat exactly once here.
      rt.composing = false;
      commitRaw(api, input, input.value, input.selectionStart ?? input.value.length);
    };
    // Rule 2: the pre-edit caret is only observable now.
    const onBeforeInput = () => {
      rt.preEdit = { value: input.value, start: input.selectionStart ?? 0 };
    };
    const onKeydown = (event: KeyboardEvent) => {
      // Rule 4: Backspace/Delete must always remove a DIGIT. Over a separator the
      // browser would delete it and the reformat would put it straight back.
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      if (input.selectionStart !== input.selectionEnd) return; // ranges contain digits
      const caret = input.selectionStart ?? 0;
      const direction = event.key === 'Backspace' ? -1 : 1;
      const adjacent = direction === -1 ? input.value[caret - 1] : input.value[caret];
      if (adjacent === undefined || /\d/.test(adjacent)) return;
      event.preventDefault();
      const digitIndex = nearestDigitIndex(input.value, caret, direction);
      if (digitIndex === -1) return;
      const k = digitsBefore(input.value, digitIndex);
      const digits = digitsOf(input.value);
      commitDigits(api, input, digits.slice(0, k) + digits.slice(k + 1), k);
    };
    const onInput = () => {
      if (rt.composing) return;
      commitRaw(api, input, input.value, input.selectionStart ?? input.value.length);
    };
    const onPick = () => {
      const iso2 = select.value;
      if (!iso2) return;
      setCountry(api, iso2, true);
      wantRules(api);
      // D9: focus moves to the number field after choosing a country.
      input.focus();
      publish(api);
    };
    // A form reset restores the inputs' default values; the digits must follow.
    const form = input.form;
    const onReset = () =>
      queueMicrotask(() => {
        api.setState({ digits: '', country: api.inputs().country?.trim().toLowerCase() || null });
        rt.preEdit = null;
        show(api);
        publish(api);
      });

    input.addEventListener('focus', onFocus);
    input.addEventListener('compositionstart', onCompositionStart);
    input.addEventListener('compositionend', onCompositionEnd);
    input.addEventListener('beforeinput', onBeforeInput);
    input.addEventListener('keydown', onKeydown);
    input.addEventListener('input', onInput);
    select.addEventListener('change', onPick);
    form?.addEventListener('reset', onReset);
    const unsyncFace = syncSelectedContent(select);

    // One chunk for all 244 flags (D4a): the addon shows one at once, the picker every one when opened.
    rt.flags = loadAllFlags().then((flags) => api.setState({ flags }));

    // A country picked before hydration, then text typed (or restored on back-navigation): the user's.
    const picked = select.value;
    if (picked && picked !== countryOf(api)) setCountry(api, picked, true);
    if (digitsOf(input.value) !== api.state().digits) commitRaw(api, input, input.value, input.value.length);
    else show(api);
    if (api.state().digits) wantRules(api);
    if (document.activeElement === input) onFocus();

    return () => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('compositionstart', onCompositionStart);
      input.removeEventListener('compositionend', onCompositionEnd);
      input.removeEventListener('beforeinput', onBeforeInput);
      input.removeEventListener('keydown', onKeydown);
      input.removeEventListener('input', onInput);
      select.removeEventListener('change', onPick);
      unsyncFace();
      form?.removeEventListener('reset', onReset);
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    if (inputs.value !== prev.value && (inputs.value?.trim() || null) !== api.state().value) writeValue(api, inputs.value);
    const country = inputs.country?.trim().toLowerCase();
    if (country && inputs.country !== prev.country) setCountry(api, country, false);
    else if (inputs.defaultCountry !== prev.defaultCountry || inputs.allowedCountries !== prev.allowedCountries) show(api);
  },
  methods: {
    focusInput: (api, options) => field(api)?.focus(options),
    whenReady: async (api) => {
      const rt = runtime(api);
      await rt.flags;
      // A rules load can start another (the country changed meanwhile): settle the latest.
      let pending: Promise<void>;
      do {
        pending = rt.pending;
        await pending;
      } while (pending !== rt.pending);
    },
  },
});
