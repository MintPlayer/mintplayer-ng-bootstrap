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
