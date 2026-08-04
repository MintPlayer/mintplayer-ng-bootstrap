import { describe, expect, it } from 'vitest';
import {
  AsYouType,
  getExampleNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json' with { type: 'json' };
import { phoneCountries } from './countries';
import { metadataLoaders } from './metadata-loaders.generated';
import { loadPhoneRules } from './validation';

/**
 * The metadata chunks are sliced out of `libphonenumber-js`'s own
 * `metadata.max.json` by `tools/scripts/build-phone-metadata.mjs`, one per
 * *calling code*. The slice unit rests on two facts about how Google stores a
 * shared calling code: a block's formats live only in its "main" country, and a
 * number typed under one member is validated against all of them.
 *
 * Neither fact is guaranteed by the metadata format version, so neither would
 * break loudly on a libphonenumber upgrade — the failure mode is a number that
 * silently stops formatting, or stops validating. Both directions are therefore
 * checked against `/max`, which is the oracle by definition. This spec is why a
 * libphonenumber upgrade is a CI event rather than a support ticket.
 */
const SPREAD = ['be', 'nl', 'de', 'fr', 'gb', 'us', 'ca', 'it', 'ru', 'cn', 'in', 'br', 'au', 'jp', 'sa'];
/** Countries whose formats are inherited from another country of the same calling code. */
const INHERITORS = ['kz', 'va', 'ax', 'gg', 'im', 'je', 'bb', 'pr', 'sj', 'yt', 'bq', 'cc', 'eh', 'mf'];

/**
 * A number that belongs to a *sibling* of the selected country. `/max` accepts
 * these, and a user on a US form typing a Toronto number is mainstream, not an
 * edge case: slicing by country instead of by calling code was measured rejecting
 * 586 of 640 such numbers.
 */
const SIBLINGS: [selected: string, national: string, belongsTo: string][] = [
  ['us', '5062345678', 'ca'],
  ['us', '7872345678', 'pr'],
  ['us', '2462501234', 'bb'],
  ['ca', '2125551234', 'us'],
  ['gb', '7781123456', 'gg'],
  ['gb', '7924123456', 'im'],
  ['ru', '7710009998', 'kz'],
  ['it', '3123456789', 'va'],
  ['fi', '412345678', 'ax'],
  ['au', '412345678', 'cc'],
];

/** One real number per country under test, national form as a user would type it. */
const EXAMPLES: Record<string, string> = {
  be: '470123456',
  nl: '612345678',
  de: '15112345678',
  fr: '612345678',
  gb: '7911123456',
  us: '2125551234',
  ca: '5062345678',
  it: '3331234567',
  ru: '9011234567',
  cn: '13123456789',
  in: '8123456789',
  br: '11961234567',
  au: '412345678',
  jp: '9012345678',
  sa: '512345678',
  kz: '7710009998',
  va: '3123456789',
  ax: '412345678',
  gg: '7781123456',
  im: '7924123456',
  je: '7797712345',
  bb: '2462501234',
  pr: '7872345678',
  sj: '41234567',
  yt: '639012345',
  bq: '3181234',
  cc: '412345678',
  eh: '650123456',
  mf: '690001234',
};

/**
 * The PRD's F1 formatter, run against the full `/max` set — the oracle for
 * `PhoneRules.format`.
 *
 * `dialCode` MUST come from `/max` (`PhoneNumber.countryCallingCode`), never from
 * the `PhoneRules` under test: feeding our own value into the oracle makes a wrong
 * dial code cancel out on both sides, which is exactly how this spec used to pass
 * while leaving the only silently-failing coupling in the design unguarded.
 */
function formatViaMax(dialCode: string, nationalDigits: string): string {
  const formatted = new AsYouType().input(`+${dialCode}${nationalDigits}`);
  let seen = 0;
  let i = 0;
  for (; i < formatted.length && seen < dialCode.length; i++) {
    if (/\d/.test(formatted[i])) seen++;
  }
  while (i < formatted.length && !/\d/.test(formatted[i])) i++;
  return formatted.slice(i);
}

describe('per-calling-code metadata parity with the full /max set', () => {
  it('ships a loader for every selectable country', () => {
    const missing = phoneCountries.map((c) => c.iso2).filter((iso2) => !(iso2 in metadataLoaders));
    expect(missing).toEqual([]);
  });

  it.each([...SPREAD, ...INHERITORS])('%s formats, validates and types identically to /max', async (iso2) => {
    const rules = await loadPhoneRules(iso2);
    expect(rules).toBeDefined();

    const country = iso2.toUpperCase() as CountryCode;
    const parsed = parsePhoneNumberFromString(EXAMPLES[iso2], country);
    expect(parsed, `no /max parse for the ${iso2} example number`).toBeDefined();
    const national = parsed!.nationalNumber;

    // Formatting must match at EVERY keystroke, not only on the finished number:
    // an inherited-formats regression shows up as unformatted mid-typing output.
    // Independent of anything under test — see formatViaMax's note.
    const maxDialCode = parsed!.countryCallingCode;
    expect(rules!.dialCode, `${iso2} dial code`).toBe(maxDialCode);

    for (let n = 1; n <= national.length; n++) {
      const part = national.slice(0, n);
      expect(rules!.format(part), `${iso2} after ${n} digits`).toBe(formatViaMax(maxDialCode, part));
      expect(rules!.lengthProblem(part) ?? 'OK').toBe(validatePhoneNumberLength(part, country) ?? 'OK');
    }

    expect(rules!.isValid(national)).toBe(isValidPhoneNumber(national, country));
    expect(rules!.isValid(national.slice(0, -1))).toBe(isValidPhoneNumber(national.slice(0, -1), country));
    expect(rules!.isValid(`${national}7`)).toBe(isValidPhoneNumber(`${national}7`, country));
    expect(rules!.type(national)).toBe(parsed!.getType());
    expect(rules!.toE164(national)).toBe(parsed!.number);
  });

  it.each(SIBLINGS)('%s accepts %s (a %s number) exactly as /max does', async (selected, national, _belongsTo) => {
    const rules = await loadPhoneRules(selected);
    const country = selected.toUpperCase() as CountryCode;
    expect(rules!.isValid(national)).toBe(isValidPhoneNumber(national, country));
    expect(rules!.type(national)).toBe(parsePhoneNumberFromString(national, country)?.getType());
    expect(rules!.toE164(national)).toBe(parsePhoneNumberFromString(national, country)?.number);
  });

  /**
   * The spreads above are hand-picked, so they prove the mechanism but cannot
   * prove coverage. This closes that gap by sweeping EVERY selectable country
   * against `/max`, taking the number from libphonenumber's own example table
   * instead of a curated list — which is what makes the check exhaustive and
   * self-maintaining as countries are added upstream.
   *
   * One assertion per country would hide how many failed behind the first
   * failure, so the whole sweep is collected and compared as a list.
   */
  it('every selectable country formats, validates and types identically to /max', async () => {
    const divergences: string[] = [];
    const skipped: string[] = [];

    for (const { iso2 } of phoneCountries) {
      const country = iso2.toUpperCase() as CountryCode;
      const example = getExampleNumber(country, examples);
      if (!example) {
        // No upstream example (a few territories have none) — nothing to compare.
        skipped.push(iso2);
        continue;
      }
      const national = example.nationalNumber;
      const rules = await loadPhoneRules(iso2);
      if (!rules) {
        divergences.push(`${iso2}: no rules loaded`);
        continue;
      }

      const checks: [label: string, ours: unknown, max: unknown][] = [
        // `example.countryCallingCode` is /max's own answer, so this catches a wrong
        // dial code instead of cancelling it out of the format comparison below.
        ['dialCode', rules.dialCode, example.countryCallingCode],
        ['format', rules.format(national), formatViaMax(example.countryCallingCode, national)],
        ['isValid', rules.isValid(national), isValidPhoneNumber(national, country)],
        ['isValid(-1)', rules.isValid(national.slice(0, -1)), isValidPhoneNumber(national.slice(0, -1), country)],
        ['isValid(+1)', rules.isValid(`${national}7`), isValidPhoneNumber(`${national}7`, country)],
        ['type', rules.type(national), example.getType()],
        ['toE164', rules.toE164(national), example.number],
        ['lengthProblem', rules.lengthProblem(national) ?? 'OK', validatePhoneNumberLength(national, country) ?? 'OK'],
      ];
      checks
        .filter(([, ours, max]) => ours !== max)
        .forEach(([label, ours, max]) => divergences.push(`${iso2} ${label}: ours=${String(ours)} /max=${String(max)}`));
    }

    expect(divergences, `${divergences.length} divergence(s) across ${phoneCountries.length} countries`).toEqual([]);
    // Guard the guard: if upstream examples vanished, the sweep would pass vacuously.
    expect(skipped.length, `skipped for want of an upstream example: ${skipped.join(', ')}`).toBeLessThan(15);
  });
});
