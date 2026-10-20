import { phoneCountries, type PhoneCountry } from './countries';

/**
 * What an international-looking input resolved to.
 *
 * `nationalNumber` excludes the calling code but KEEPS the area code — for
 * `+1 416 555 1234` the national number is `4165551234`, because the area code is
 * part of the number the user owns, not part of the prefix that identifies the
 * country.
 */
export interface DialStringMatch {
  readonly country: PhoneCountry;
  /** Calling-code digits, without `+`. */
  readonly dialCode: string;
  readonly nationalNumber: string;
}

/** `+32 470…`, `0032470…`, `00 32 470…` — anything claiming to carry a calling code. */
const INTERNATIONAL = /^\s*(?:\+|00)/;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Resolve the country of a pasted or typed international number.
 *
 * Returns `undefined` — rather than guessing — for a bare national number, an
 * unassigned calling code, or a prefix too short to identify anything. The caller
 * can then leave the current country selection alone, which matters because
 * detection is irreducibly ambiguous for territories sharing a numbering range
 * (`ax`/`fi`, `cx`/`cc`/`au`, `bl`/`mf`/`gp`, `sj`/`no`, `va`/`it`, `eh`/`ma`):
 * a detected country must never overwrite an explicit user choice.
 *
 * This is deliberately NOT libphonenumber's job. `parsePhoneNumber().country`
 * returns `null` until a number is *valid*, so it cannot name a country while the
 * user is still typing — which is exactly when the flag has to update.
 */
export function countryForDialString(value: string, only?: readonly string[]): DialStringMatch | undefined {
  if (!INTERNATIONAL.test(value)) return undefined;

  // `00` is the international access prefix in most of the world; strip it so the
  // remainder is a calling code either way.
  const digits = digitsOnly(value).replace(/^00/, '');
  if (!digits) return undefined;

  const allow = only?.map((code) => code.trim().toLowerCase()).filter(Boolean);
  const candidates = phoneCountries
    .filter((country) => (!allow || allow.includes(country.iso2)) && digits.startsWith(country.dialCode))
    .map((country) => {
      const rest = digits.slice(country.dialCode.length);
      const areaCode = country.areaCodes?.find((code) => rest.startsWith(code));
      return {
        country,
        // A matched area code lengthens the identifying prefix, which is what
        // separates Barbados (+1 246) from the rest of +1.
        matchLength: country.dialCode.length + (areaCode?.length ?? 0),
        // A country that HAS area codes but matched none is a poor answer: it is
        // only in the running because its bare dial code matched. Without this,
        // `ca` (which lists area codes) wins every unlisted `+1` number over `us`
        // (which lists none) purely by being enumerated.
        areaMiss: country.areaCodes && !areaCode ? 1 : 0,
      };
    });

  const best = candidates.sort(
    (a, b) =>
      b.matchLength - a.matchLength || a.areaMiss - b.areaMiss || a.country.priority - b.country.priority,
  )[0];
  if (!best) return undefined;

  return {
    country: best.country,
    dialCode: best.country.dialCode,
    nationalNumber: digits.slice(best.country.dialCode.length),
  };
}
