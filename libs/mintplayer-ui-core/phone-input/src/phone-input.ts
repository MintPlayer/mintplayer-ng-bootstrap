import { errorFeedback } from '@mintplayer/ui-core/forms';
import { phoneCountryList, type PhoneCountryOption, type PhoneRules } from '@mintplayer/ui-core/phone-core';
import type { FlagMap } from '@mintplayer/ui-core/flags';
import { hydratedAttr } from '@mintplayer/ui-core/store';

/**
 * The phone input (PRD #437; the field's own design is docs/prd/phone-input-wc.md):
 * a country picker, a dial-code addon and a tel input, joined as one Bootstrap
 * `.input-group`. The digits the user typed are the durable state; country,
 * formatting rules and flags are disposable and reload around them (D17).
 *
 * Everything here is pure: `connectPhoneInput` turns the options into one
 * attribute bag per node, and the core (`phone-input.core.ts`) owns the typing.
 */

export const PHONE_INPUT_SCOPE = 'phone-input';

export type PhoneBag = Record<string, string | number | boolean | null>;

export interface PhoneChangeEventDetail {
  /** E.164 (`'+32470123456'`), or null while the input is empty. */
  value: string | null;
  country: string;
  dialCode: string;
  nationalNumber: string;
  /** `undefined` until the country's rules have loaded: honest, not optimistic. */
  valid: boolean | undefined;
}

export interface PhoneCountryOptionView {
  readonly key: string;
  readonly bag: PhoneBag;
  /** The plain option text, name first: native typeahead prefix-matches it (S2). */
  readonly label: string;
  readonly name: string;
  readonly dial: string;
  readonly iso: string;
  /** The flag SVG, or '' until the corpus has loaded. Decorative. */
  readonly flag: string;
}

export interface PhoneInputView {
  readonly root: PhoneBag;
  readonly group: PhoneBag;
  readonly select: PhoneBag;
  readonly options: readonly PhoneCountryOptionView[];
  /** Customizable select: options carry a flag, the closed face shows flag + ISO. */
  readonly rich: boolean;
  readonly flagBox: PhoneBag;
  readonly listOnly: PhoneBag;
  readonly richLabel: PhoneBag;
  readonly closedOnly: PhoneBag;
  readonly addon: PhoneBag;
  readonly flag: PhoneBag;
  readonly flagHtml: string;
  readonly dial: PhoneBag;
  readonly dialText: string;
  readonly input: PhoneBag;
  /** Carries the E.164 value under `name` once the field is live; null before. */
  readonly hidden: PhoneBag | null;
  readonly showFeedback: boolean;
  readonly feedback: { readonly attrs: PhoneBag; readonly text: string };
}

export interface PhoneInputOptions {
  readonly id: string;
  readonly countries: readonly PhoneCountryOption[];
  readonly country: string;
  readonly digits: string;
  readonly rules: PhoneRules | undefined;
  readonly flags: FlagMap | undefined;
  readonly disabled: boolean;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly errorText: string | null;
  readonly placeholder: string | null;
  readonly autocomplete: string;
  readonly name: string | null;
  /** Accessible name of the tel input. */
  readonly label: string | null;
  readonly countryLabel: string | null;
  readonly hydrated: boolean;
  readonly rich: boolean;
}

const scoped = (bag: PhoneBag): PhoneBag => ({ ...bag, 'data-mps': PHONE_INPUT_SCOPE });

/** Lowercase ISO codes from an array or a comma-separated string. */
export function countryCodes(value: readonly string[] | string | null | undefined): string[] {
  const list = typeof value === 'string' ? value.split(',') : (value ?? []);
  return list.map((code) => code.trim().toLowerCase()).filter(Boolean);
}

const lists = new Map<string, readonly PhoneCountryOption[]>();

/**
 * The picker's countries, cached per (locale, preferred, allowed): building the
 * list names 244 countries through Intl.DisplayNames, once per render otherwise.
 */
export function pickerCountries(locale: string | null, preferred: readonly string[], only: readonly string[] | null): readonly PhoneCountryOption[] {
  const key = `${locale ?? ''}|${preferred.join()}|${only?.join() ?? '*'}`;
  let list = lists.get(key);
  if (!list) {
    list = phoneCountryList({ locale: locale ?? undefined, preferred: [...preferred], only: only ? [...only] : undefined });
    lists.set(key, list);
  }
  return list;
}

/** The rules apply only to the country they were loaded for. */
export function rulesFor(rules: PhoneRules | undefined, country: string): PhoneRules | undefined {
  return rules && rules.country === country ? rules : undefined;
}

export function formatDigits(rules: PhoneRules | undefined, country: string, digits: string): string {
  return rulesFor(rules, country)?.format(digits) ?? digits;
}

/** E.164, or null while empty. Until the rules load the naive join is the best answer (flagged by `valid: undefined`). */
export function phoneValue(rules: PhoneRules | undefined, country: string, dialCode: string, digits: string): string | null {
  if (!digits) return null;
  return rulesFor(rules, country)?.toE164(digits) ?? `+${dialCode}${digits}`;
}

export function phoneValid(rules: PhoneRules | undefined, country: string, digits: string): boolean | undefined {
  return rulesFor(rules, country)?.isValid(digits);
}

export function connectPhoneInput(options: PhoneInputOptions): PhoneInputView {
  const { id, country, countries } = options;
  const dialCode = countries.find((c) => c.iso2 === country)?.dialCode ?? '';
  const dialId = `${id}-dial`;
  const error = errorFeedback(`${id}-error`, options.errorText, options.invalid);
  const describedBy = [dialId, error.control['aria-describedby']].filter(Boolean).join(' ');
  const flags = options.flags;
  const value = phoneValue(options.rules, country, dialCode, options.digits);

  return {
    root: scoped({ class: 'phone-input', ...hydratedAttr(options.hydrated) }),
    group: scoped({ class: 'input-group' }),
    select: scoped({
      class: 'form-select',
      id: `${id}-country`,
      disabled: options.disabled,
      'aria-label': options.countryLabel ?? 'Country',
    }),
    options: countries.map((c) => ({
      key: c.iso2,
      bag: { value: c.iso2, selected: c.iso2 === country },
      label: `${c.name} +${c.dialCode} (${c.iso2.toUpperCase()})`,
      name: c.name,
      dial: `+${c.dialCode}`,
      iso: c.iso2.toUpperCase(),
      flag: flags?.[c.iso2] ?? '',
    })),
    rich: options.rich,
    // The option content is cloned into the select's closed face by the browser,
    // so these spans carry no scope: the rules for them are anchored on the select.
    flagBox: { class: 'flag-box', 'aria-hidden': 'true' },
    listOnly: { 'data-list-only': '' },
    richLabel: { class: 'rich-label', 'data-list-only': '' },
    closedOnly: { 'data-closed-only': '' },
    addon: scoped({ class: 'input-group-text addon', id: dialId }),
    flag: scoped({ class: 'flag', 'aria-hidden': 'true' }),
    flagHtml: flags?.[country] ?? '',
    // dir=ltr is required, not cosmetic: the plus sign is bidi-neutral, so in an
    // RTL paragraph it reorders and the code reads 32+ (PRD 12.6).
    dial: scoped({ class: 'dial-code', dir: 'ltr' }),
    dialText: `+${dialCode}`,
    input: scoped({
      class: 'form-control',
      id: `${id}-input`,
      type: 'tel',
      inputmode: 'tel',
      autocomplete: options.autocomplete,
      placeholder: options.placeholder,
      // With JavaScript off the typed text is what submits; once live, the hidden
      // input carries the E.164 value instead.
      name: options.hydrated ? null : options.name,
      value: formatDigits(options.rules, country, options.digits),
      disabled: options.disabled,
      required: options.required,
      'aria-label': options.label ?? 'Phone number',
      'aria-invalid': options.invalid ? 'true' : null,
      'aria-required': options.required ? 'true' : null,
      'aria-errormessage': error.control['aria-errormessage'],
      'aria-describedby': describedBy,
    }),
    hidden: options.hydrated && options.name ? scoped({ type: 'hidden', name: options.name, value: value ?? '', disabled: options.disabled }) : null,
    showFeedback: !!error.message,
    feedback: error.message ? { attrs: scoped(error.message.attrs), text: error.message.text } : { attrs: {}, text: '' },
  };
}
