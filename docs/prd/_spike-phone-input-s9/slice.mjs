// S9 — candidate per-country metadata slicer, under test.
//
// libphonenumber-js metadata (format version 4) is
//   { version, country_calling_codes: { cc: [iso2…] }, countries: { ISO2: [...] }, nonGeographic }
// and a country entry is a positional array whose indices are documented by
// METADATA.md and read by `source/metadata.js`'s NumberingPlan:
//   0 callingCode  1 IDDPrefix  2 nationalNumberPattern  3 possibleLengths
//   4 formats      5 nationalPrefix  6 nationalPrefixFormattingRule
//   7 nationalPrefixForParsing  8 nationalPrefixTransformRule
//   9 nationalPrefixIsOptionalWhenFormatting  10 leadingDigits  11 types
//   12 defaultIDDPrefix
//
// THE TRAP: formats(), nationalPrefixFormattingRule() and
// nationalPrefixIsOptionalWhenFormatting() fall back to the metadata of the
// *main* country for the calling code (`country_calling_codes[cc][0]`) — Google
// stores NANP formats only in US, +7 formats only in RU, and so on. A slice
// containing CA alone therefore formats nothing at all.
const I_FORMATS = 4;
const I_TYPES = 11;

/** Main country for a calling code, per the full table (`country_calling_codes[cc][0]`). */
export function mainCountryFor(full, iso2) {
  const cc = full.countries[iso2][0];
  return full.country_calling_codes[cc][0];
}

/**
 * @param strategy 'country'    — the naive slice: the one country, nothing else.
 *                 'withFormats' — plus the main country's entry with its `types` dropped.
 *                 'withMain'   — plus the main country's entry verbatim.
 */
export function slice(full, iso2, strategy = 'withFormats') {
  const entry = full.countries[iso2];
  if (!entry) throw new Error(`unknown country ${iso2}`);
  const cc = entry[0];
  const main = full.country_calling_codes[cc][0];

  const countries = { [iso2]: entry };
  let callingCodeCountries = [iso2];

  if (strategy !== 'country' && main !== iso2) {
    const mainEntry = full.countries[main];
    countries[main] =
      strategy === 'withMain'
        ? mainEntry
        : // Keep every index the formatter reads; drop only the type regexes,
          // which are the bulk of a NANP entry and are never consulted for a
          // country we already know.
          mainEntry.map((v, i) => (i === I_TYPES ? 0 : v));
    // Order matters: getNumberingPlanMetadata(cc) reads index 0, and the
    // formatter must land on the main country's formats.
    callingCodeCountries = [main, iso2];
  }

  return {
    version: full.version,
    country_calling_codes: { [cc]: callingCodeCountries },
    countries,
  };
}

/** Does this country carry its own `formats`, or does it inherit them? */
export function hasOwnFormats(full, iso2) {
  const f = full.countries[iso2][I_FORMATS];
  return Array.isArray(f) && f.length > 0;
}

/**
 * Per-CALLING-CODE slice — the unit S9 settled on. Every country sharing the
 * calling code, in the full table's order.
 *
 * Fixes the divergence a per-country slice has in BOTH directions: a non-main
 * country loses the block's formats entirely (they are stored only in the main
 * country), and a main country rejects its siblings' numbers, which `/max`
 * accepts — measured at 586 of 640 sibling cases.
 */
export function sliceBlock(full, iso2) {
  const entry = full.countries[iso2];
  if (!entry) throw new Error(`unknown country ${iso2}`);
  const cc = entry[0];
  const members = full.country_calling_codes[cc];
  return {
    version: full.version,
    country_calling_codes: { [cc]: [...members] },
    countries: Object.fromEntries(members.map((c) => [c, full.countries[c]])),
    nonGeographic: {},
  };
}
