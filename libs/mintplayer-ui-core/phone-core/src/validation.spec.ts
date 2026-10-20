import { describe, expect, it } from 'vitest';
import { loadPhoneRules } from './validation';

describe('loadPhoneRules', () => {
  it('formats the national part, which AsYouType(country) alone would not', async () => {
    const be = await loadPhoneRules('be');
    // `new AsYouType('BE').input('470123456')` returns the digits unchanged:
    // libphonenumber's national patterns expect the trunk prefix, which this
    // component's value model deliberately omits.
    expect(be?.format('470123456')).toBe('470 12 34 56');
    expect(be?.format('')).toBe('');
  });

  it('formats countries whose formats live in another country of the same calling code', async () => {
    // Google stores NANP formats only in US, +7's only in RU, +39's only in IT —
    // a slice that carried CA/KZ/VA alone would format nothing at all.
    expect((await loadPhoneRules('ca'))?.format('5062345678')).toBe('506 234 5678');
    expect((await loadPhoneRules('kz'))?.format('7710009998')).toBe('771 000 9998');
    expect((await loadPhoneRules('va'))?.format('3123456789')).toBe('312 345 6789');
  });

  it('validates with full precision, rejecting a number that is one digit short', async () => {
    const be = await loadPhoneRules('be');
    expect(be?.isValid('470123456')).toBe(true);
    expect(be?.isValid('47012345')).toBe(false);
    expect(be?.isValid('4701234567')).toBe(false);
  });

  it('accepts a sibling country\'s number, as the full metadata set does', async () => {
    // A Toronto number on a form set to the United States, and a Guernsey mobile
    // on one set to the United Kingdom. Both are mainstream; rejecting them was
    // the defect that made the calling code — not the country — the slice unit.
    expect((await loadPhoneRules('us'))?.isValid('5062345678')).toBe(true);
    expect((await loadPhoneRules('gb'))?.isValid('7781123456')).toBe(true);
  });

  it('reports the number type, for shared calling codes too', async () => {
    expect((await loadPhoneRules('be'))?.type('470123456')).toBe('MOBILE');
    expect((await loadPhoneRules('be'))?.type('23456789')).toBe('FIXED_LINE');
    expect((await loadPhoneRules('ru'))?.type('8001234567')).toBe('TOLL_FREE');
    expect((await loadPhoneRules('ax'))?.type('412345678')).toBe('MOBILE');
  });

  it('reports why a length is wrong, so as-you-type can stop before de-formatting', async () => {
    const us = await loadPhoneRules('us');
    expect(us?.lengthProblem('212555')).toBe('TOO_SHORT');
    expect(us?.lengthProblem('2125551234')).toBeUndefined();
    expect(us?.lengthProblem('21255512345')).toBe('TOO_LONG');
  });

  it('assembles E.164 through the parser, never by stripping the national prefix', async () => {
    // Russia's trunk prefix is `8` and its toll-free numbers also start with `8`,
    // so a string rule would produce +7001234567.
    expect((await loadPhoneRules('ru'))?.toE164('8001234567')).toBe('+78001234567');
    expect((await loadPhoneRules('ru'))?.toE164('89011234567')).toBe('+79011234567');
    // Italy's leading zero is significant and must survive.
    expect((await loadPhoneRules('it'))?.toE164('0212345678')).toBe('+390212345678');
    expect((await loadPhoneRules('be'))?.toE164('0470123456')).toBe('+32470123456');
    expect((await loadPhoneRules('be'))?.toE164('')).toBeNull();
  });

  // Pinned deliberately: the dial code comes from our own country table, not from
  // libphonenumber's metadata, precisely so no positional access exists at runtime.
  it('exposes the dial code from the country table, not from metadata internals', async () => {
    expect((await loadPhoneRules('be'))?.dialCode).toBe('32');
    expect((await loadPhoneRules('ca'))?.dialCode).toBe('1');
  });

  it('is case-insensitive, trims, and caches one promise per country', async () => {
    expect(await loadPhoneRules('  BE ')).toBe(await loadPhoneRules('be'));
    expect(loadPhoneRules('fr')).toBe(loadPhoneRules('fr'));
  });

  it('resolves undefined for an unknown country instead of rejecting', async () => {
    await expect(loadPhoneRules('zz')).resolves.toBeUndefined();
    await expect(loadPhoneRules('')).resolves.toBeUndefined();
  });
});
