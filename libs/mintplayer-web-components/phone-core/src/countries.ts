import { rawCountryData, type Iso2 } from 'intl-tel-input/data';

/**
 * A dial-code country, as a named record instead of a positional tuple.
 *
 * `priority` and `areaCodes` are what disambiguate a shared dial code — the +1
 * NANP block (US, CA and ~20 Caribbean territories) and the +44/+7/+61/+590
 * groups — so they are carried through rather than flattened away.
 */
export interface PhoneCountry {
  readonly iso2: Iso2;
  readonly dialCode: string;
  /** Lower wins when several countries share a dial code. */
  readonly priority: number;
  readonly areaCodes: readonly string[] | null;
  readonly nationalPrefix: string | null;
}

/**
 * Every country with a dial code, in `intl-tel-input`'s upstream order.
 *
 * Imported eagerly (~4 KB gzip): a phone input cannot render its picker without
 * it. Display names are not here — they come from `Intl.DisplayNames` at render
 * time, localized and free.
 */
export const phoneCountries: readonly PhoneCountry[] = rawCountryData.map(
  ([iso2, dialCode, priority, areaCodes, nationalPrefix]) => ({
    iso2,
    dialCode,
    priority: priority ?? 0,
    areaCodes: areaCodes ?? null,
    nationalPrefix: nationalPrefix ?? null,
  }),
);

/** A country ready to render in a picker: the data plus its localized name. */
export interface PhoneCountryOption extends PhoneCountry {
  /** Localized country name, or the upper-case ISO code if the runtime has none. */
  readonly name: string;
}

export interface PhoneCountryListOptions {
  /**
   * BCP-47 tag for the country names and their collation. Omitted means the
   * runtime's own locale — deliberately not defaulted to `'en-US'`, which is an
   * instruction to render US English rather than a neutral fallback.
   */
  readonly locale?: string;
  /** ISO codes to pin above the rest, in the order given. */
  readonly preferred?: readonly string[];
  /** ISO codes to restrict the list to. Anything else is dropped. */
  readonly only?: readonly string[];
}

// Both are comparatively expensive to construct and are rebuilt on every render
// otherwise, so they are memoized per locale — the same approach the scheduler's
// date service takes with its Intl formatters.
const displayNamesByLocale = new Map<string, Intl.DisplayNames | null>();
const collatorByLocale = new Map<string, Intl.Collator>();

function regionNames(locale: string | undefined): Intl.DisplayNames | null {
  const key = locale ?? '';
  let names = displayNamesByLocale.get(key);
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(locale ? [locale] : undefined, { type: 'region' });
    } catch {
      // An invalid tag from a consumer must not take the picker down with it.
      names = null;
    }
    displayNamesByLocale.set(key, names);
  }
  return names;
}

function collator(locale: string | undefined): Intl.Collator {
  const key = locale ?? '';
  let existing = collatorByLocale.get(key);
  if (!existing) {
    try {
      existing = new Intl.Collator(locale ? [locale] : undefined);
    } catch {
      existing = new Intl.Collator();
    }
    collatorByLocale.set(key, existing);
  }
  return existing;
}

/**
 * The localized name of a country, e.g. `'be'` → `'België'` under `nl-BE`.
 *
 * Falls back to the upper-case ISO code rather than an empty string: the name is
 * the accessible name of a picker option, so it can never be blank.
 */
export function countryName(iso2: string, locale?: string): string {
  const code = iso2.trim().toUpperCase();
  return regionNames(locale)?.of(code) ?? code;
}

/**
 * The picker list: localized, collated in the viewer's language, with the
 * consumer's preferred countries pinned on top.
 *
 * Sorting by localized name is the point — an alphabetical list of English names
 * is not alphabetical to a Dutch reader — so the order depends on `locale` and
 * the list is rebuilt when it changes.
 */
export function phoneCountryList(options: PhoneCountryListOptions = {}): readonly PhoneCountryOption[] {
  const { locale, preferred, only } = options;
  const lower = (codes: readonly string[] | undefined) =>
    codes?.map((code) => code.trim().toLowerCase()).filter(Boolean);

  const allow = lower(only);
  const pinned = lower(preferred) ?? [];
  const named = phoneCountries
    .filter((country) => !allow || allow.includes(country.iso2))
    .map((country) => ({ ...country, name: countryName(country.iso2, locale) }));

  const byName = collator(locale);
  const rest = named
    .filter((country) => !pinned.includes(country.iso2))
    .sort((a, b) => byName.compare(a.name, b.name));

  // Preferred entries keep the consumer's order, not the collated one: the point
  // of pinning is that the caller decided what comes first.
  const top = pinned
    .map((iso2) => named.find((country) => country.iso2 === iso2))
    .filter((country): country is PhoneCountryOption => !!country);

  return [...top, ...rest];
}
