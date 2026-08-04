import type { MetadataJson, NumberType, ValidatePhoneNumberLengthResult } from 'libphonenumber-js/core';
import { phoneCountries } from './countries';
import type { PhoneMetadataCountry } from './metadata-loaders.generated';

/**
 * Everything a phone input needs to know about one country's numbering plan,
 * with libphonenumber's trailing `metadata` argument and its two counter-intuitive
 * calling conventions already absorbed.
 *
 * Deliberately not a re-export of `libphonenumber-js`: a caller that reaches the
 * module directly re-learns both traps this facade exists to hide — that national
 * formatting has to be routed through the international form (`format()`), and
 * that a trunk prefix cannot be stripped by string comparison (`toE164()`).
 *
 * Every method takes the *national significant number* as bare digits — what the
 * user typed, without the dial code, which is static adjacent text in the UI.
 */
export interface PhoneRules {
  /** Lowercase ISO 3166-1 alpha-2 code these rules describe. */
  readonly country: PhoneMetadataCountry;
  /** Calling code digits, without `+`, read from the metadata itself. */
  readonly dialCode: string;
  /**
   * As-you-type formatting of the national part: `'470123456'` → `'470 12 34 56'`.
   *
   * Routed through the international form because libphonenumber's national
   * patterns are written against the number *with* its trunk prefix, so feeding a
   * bare national number to `AsYouType(country)` formats nothing at all for BE,
   * NL, DE, FR, GB and most other trunk-prefix countries.
   */
  format(nationalDigits: string): string;
  /** E.164 (`'+32470123456'`), or `null` for empty input. */
  toE164(nationalDigits: string): string | null;
  isValid(nationalDigits: string): boolean;
  /**
   * Why the length is wrong (`'TOO_SHORT'`, `'TOO_LONG'`, …), or `undefined` when
   * it is plausible. This is the guard rail that stops as-you-type formatting from
   * de-formatting once the number passes its last legal length.
   */
  lengthProblem(nationalDigits: string): ValidatePhoneNumberLengthResult | undefined;
  /** `'MOBILE'`, `'FIXED_LINE'`, … or `undefined` when the number is not valid. */
  type(nationalDigits: string): NumberType;
}

/**
 * `libphonenumber-js/core` — the functions, with no metadata bundled in.
 *
 * Its code is ~16 KB gzip and shared by every country, so it is one lazy chunk
 * fetched at most once per page; the rules it is fed are ~0.3 KB gzip per calling
 * code. Loading `/max` instead would mean 57 KB gzip of rules for 244 countries at
 * a moment when the country is already known and only one block can ever apply.
 * The specifier is a static literal because a computed one survives into the
 * published `.mjs` and breaks esbuild consumers.
 */
let corePending: Promise<typeof import('libphonenumber-js/core')> | undefined;

/**
 * The loader map is 3.3 KB gzip for 245 static import specifiers, so it is lazy
 * too — otherwise every page that merely *renders* a phone input pays for it
 * before anyone touches the field. Both imports start together, so the extra
 * indirection costs one round trip on a fetch that is already off the critical
 * path: callers do structural checks until the rules resolve.
 */
let mapPending: Promise<typeof import('./metadata-loaders.generated')> | undefined;

const rulesCache = new Map<PhoneMetadataCountry, Promise<PhoneRules | undefined>>();

/** Dial code from our own country table — see the note in `makeRules`. */
function dialCodeOf(country: PhoneMetadataCountry): string {
  return phoneCountries.find((c) => c.iso2 === country)?.dialCode ?? '';
}

/** Drop the leading `ccDigits` digits of a formatted number, plus the separators after them. */
function stripCallingCode(formatted: string, ccDigits: number): string {
  let seen = 0;
  let i = 0;
  for (; i < formatted.length && seen < ccDigits; i++) {
    if (/\d/.test(formatted[i])) seen++;
  }
  while (i < formatted.length && !/\d/.test(formatted[i])) i++;
  return formatted.slice(i);
}

function makeRules(
  core: typeof import('libphonenumber-js/core'),
  metadata: MetadataJson,
  country: PhoneMetadataCountry,
): PhoneRules {
  const iso2 = country.toUpperCase() as Uppercase<PhoneMetadataCountry>;
  // From our own table, NOT `metadata.countries[iso2][0]`. Reading it positionally
  // out of libphonenumber's metadata is the one coupling that would fail SILENTLY
  // on an upstream layout change — and unfalsifiably, because a wrong dial code
  // feeds both the formatter and any oracle compared against it, cancelling out.
  // `phoneCountries` is the same table the picker selects from, so a mismatch
  // between the two is impossible by construction.
  const dialCode = dialCodeOf(country);
  const digitsOf = (value: string) => value.replace(/\D/g, '');

  return {
    country,
    dialCode,
    format(nationalDigits) {
      const digits = digitsOf(nationalDigits);
      if (!digits) return '';
      const international = new core.AsYouType(undefined, metadata).input(`+${dialCode}${digits}`);
      return stripCallingCode(international, dialCode.length);
    },
    toE164(nationalDigits) {
      const digits = digitsOf(nationalDigits);
      if (!digits) return null;
      // Only the metadata can tell a trunk prefix from a significant digit:
      // Russia's national prefix is `8` and its toll-free numbers also begin with
      // `8`, so `8001234567` must become `+78001234567`, not `+7001234567`. An
      // unparseable (still incomplete) number keeps the user's digits verbatim —
      // it is reported invalid anyway, and guessing would be worse.
      return core.parsePhoneNumberFromString(digits, iso2, metadata)?.number ?? `+${dialCode}${digits}`;
    },
    isValid(nationalDigits) {
      const digits = digitsOf(nationalDigits);
      return digits ? core.isValidPhoneNumber(digits, iso2, metadata) : false;
    },
    lengthProblem(nationalDigits) {
      const digits = digitsOf(nationalDigits);
      return digits ? core.validatePhoneNumberLength(digits, iso2, metadata) : 'TOO_SHORT';
    },
    type(nationalDigits) {
      const digits = digitsOf(nationalDigits);
      return digits ? core.parsePhoneNumberFromString(digits, iso2, metadata)?.getType() : undefined;
    },
  };
}

/**
 * Fetch the numbering-plan rules for one country.
 *
 * Case-insensitive. Never rejects: an unknown code — and a chunk that fails to
 * load — resolve to `undefined`, so a caller falls back to structural checks
 * (digit shape, `required`) instead of guarding every call. Resolved rules are
 * cached per country for the page's lifetime; a failed load is evicted so a
 * transient network error does not poison that country permanently.
 *
 * Rules are needed *after* a country is known, never to find one: resolving a
 * pasted `+XX…` and splitting a restored E.164 are the eager country table's job
 * (`countries.ts`), which is why one calling code's metadata is always enough.
 */
export function loadPhoneRules(country: string): Promise<PhoneRules | undefined> {
  const iso2 = country.trim().toLowerCase() as PhoneMetadataCountry;
  const cached = rulesCache.get(iso2);
  if (cached) return cached;

  const pending = Promise.all([
    (corePending ??= import('libphonenumber-js/core')),
    (mapPending ??= import('./metadata-loaders.generated')),
  ])
    .then(([core, map]) => {
      const loader = map.metadataLoaders[iso2];
      return loader ? loader().then((m) => makeRules(core, m.default, iso2)) : undefined;
    })
    .catch(() => {
      rulesCache.delete(iso2);
      return undefined;
    });
  rulesCache.set(iso2, pending);
  return pending;
}
