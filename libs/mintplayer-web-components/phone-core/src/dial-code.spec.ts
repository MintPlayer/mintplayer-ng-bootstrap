import { describe, expect, it } from 'vitest';
import { countryForDialString } from './dial-code';

/**
 * The cases are the ones spike S8 measured, kept as a table because each row is a
 * different way the naive implementation goes wrong.
 */
describe('countryForDialString', () => {
  it('does NOT fire on a bare national number', () => {
    // The single most important case: the user typing their own number must never
    // trigger a country switch.
    expect(countryForDialString('470123456')).toBeUndefined();
    expect(countryForDialString('0470123456')).toBeUndefined();
    expect(countryForDialString('')).toBeUndefined();
  });

  it('resolves an unambiguous calling code and strips it', () => {
    expect(countryForDialString('+32470123456')).toMatchObject({
      dialCode: '32',
      nationalNumber: '470123456',
    });
    expect(countryForDialString('+32470123456')?.country.iso2).toBe('be');
  });

  it('accepts the 00 international prefix and separators', () => {
    expect(countryForDialString('0032 470 12 34 56')).toMatchObject({ dialCode: '32', nationalNumber: '470123456' });
    expect(countryForDialString('+32 (470) 12-34-56')?.nationalNumber).toBe('470123456');
  });

  it('disambiguates the +1 NANP block by area code', () => {
    expect(countryForDialString('+14165551234')?.country.iso2).toBe('ca');
    expect(countryForDialString('+12125551234')?.country.iso2).toBe('us');
    expect(countryForDialString('+12462501234')?.country.iso2).toBe('bb');
  });

  it('falls back to the priority country for an unlisted +1 area code', () => {
    // The S8.1 correction: `ca` enumerates area codes and `us` does not, so
    // without the area-miss penalty `ca` would win every unlisted +1 number.
    expect(countryForDialString('+19995551234')?.country.iso2).toBe('us');
  });

  it('keeps the area code in the national number', () => {
    // The area code identifies the country here, but it still belongs to the
    // number the user owns.
    expect(countryForDialString('+14165551234')?.nationalNumber).toBe('4165551234');
  });

  it('resolves shared calling codes to the priority country', () => {
    expect(countryForDialString('+79011234567')?.country.iso2).toBe('ru'); // shared with kz
    expect(countryForDialString('+393331234567')?.country.iso2).toBe('it'); // shared with va
  });

  it('prefers the longer calling code when one is a prefix of another', () => {
    // +1 vs +1242: Bahamas is reached through +1's area codes, not a longer code,
    // so this asserts whichever mechanism the data uses resolves to bs.
    expect(countryForDialString('+12423001234')?.country.iso2).toBe('bs');
  });

  it('returns undefined for an unassigned calling code', () => {
    expect(countryForDialString('+9995551234')).toBeUndefined();
  });

  it('returns undefined for a prefix too short to identify a country', () => {
    // `+3` is a prefix of +31/+32/+33/…; guessing one would make the flag flicker
    // through countries as the user types.
    expect(countryForDialString('+3')).toBeUndefined();
  });

  it('respects an only-countries restriction', () => {
    expect(countryForDialString('+32470123456', ['nl', 'de'])).toBeUndefined();
    expect(countryForDialString('+32470123456', ['be', 'nl'])?.country.iso2).toBe('be');
  });
});
