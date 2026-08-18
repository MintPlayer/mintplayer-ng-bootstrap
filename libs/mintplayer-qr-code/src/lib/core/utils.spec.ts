import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CODEWORDS_COUNT,
  getBCHDigit,
  getSymbolSize,
  getSymbolTotalCodewords,
  isKanjiModeEnabled,
  setToSJISFunction,
  toSJIS,
} from './utils';

/**
 * The small facts the rest of the encoder is built on, all of them fixed by
 * ISO/IEC 18004 rather than by this implementation. Where a value is in the
 * standard the test asserts the standard's number, not whatever the code
 * happens to produce — a table typo is exactly the kind of defect that
 * produces a QR code no scanner will read while every unit here still "works".
 */

describe('getSymbolSize', () => {
  // Clause 5.3.1: a version-N symbol is (4N + 17) modules square. Version 1 is
  // 21x21 and version 40 is 177x177 — the two numbers everyone quotes.
  it('follows the 4N+17 rule of the standard', () => {
    expect(getSymbolSize(1)).toBe(21);
    expect(getSymbolSize(2)).toBe(25);
    expect(getSymbolSize(7)).toBe(45);
    expect(getSymbolSize(40)).toBe(177);
  });

  it('grows by exactly four modules per version', () => {
    for (let version = 2; version <= 40; version++) {
      expect(getSymbolSize(version) - getSymbolSize(version - 1), `v${version}`).toBe(4);
    }
  });

  it('always yields an odd size, so the symbol has a centre module', () => {
    for (let version = 1; version <= 40; version++) {
      expect(getSymbolSize(version) % 2, `v${version}`).toBe(1);
    }
  });

  it.each([0, -1, 41, 100])('refuses version %i', (version) => {
    expect(() => getSymbolSize(version)).toThrow();
  });

  it('refuses a missing version rather than returning 17', () => {
    expect(() => getSymbolSize(undefined as unknown as number)).toThrow(/cannot be null/);
  });
});

describe('getSymbolTotalCodewords', () => {
  // Table 1 of the standard. The four anchors below are the ones a transcription
  // error would show up in first.
  it.each([
    [1, 26],
    [2, 44],
    [10, 346],
    [40, 3706],
  ])('reports %i codewords for version %i', (version, expected) => {
    expect(getSymbolTotalCodewords(version)).toBe(expected);
  });

  it('has an entry for every version and a dead slot at index 0', () => {
    expect(CODEWORDS_COUNT).toHaveLength(41);
    expect(CODEWORDS_COUNT[0]).toBe(0);
  });

  // Capacity cannot shrink as the symbol grows; a table typo that swapped two
  // rows would break this without breaking any single lookup.
  it('increases monotonically with version', () => {
    for (let version = 2; version <= 40; version++) {
      expect(CODEWORDS_COUNT[version], `v${version}`).toBeGreaterThan(CODEWORDS_COUNT[version - 1]);
    }
  });
});

describe('getBCHDigit', () => {
  // It is the position of the highest set bit, used to align the polynomial
  // division that produces the format and version information.
  it('counts the significant bits of a value', () => {
    expect(getBCHDigit(0)).toBe(0);
    expect(getBCHDigit(1)).toBe(1);
    expect(getBCHDigit(0b1000)).toBe(4);
    expect(getBCHDigit(0x1F25)).toBe(13);
  });

  it('agrees with the bit length of every power of two', () => {
    for (let exponent = 0; exponent < 31; exponent++) {
      expect(getBCHDigit(2 ** exponent), `2^${exponent}`).toBe(exponent + 1);
    }
  });

  // The shift is unsigned, so a value with the sign bit set terminates rather
  // than looping forever — which a signed `>>` would do.
  it('terminates on a value with the top bit set', () => {
    expect(getBCHDigit(0x80000000)).toBe(32);
  });
});

describe('the Kanji mode switch', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  /*
   * Kanji mode is off until a consumer supplies a Shift-JIS lookup, because the
   * table is far larger than the encoder and shipping it would double the
   * bundle for everyone. `isKanjiModeEnabled` is what `segments.ts` asks before
   * it will even consider Kanji segments, so this switch decides whether a
   * Japanese string is encoded compactly or falls back to UTF-8 bytes.
   */
  it('reports Kanji mode as available once a converter is registered', async () => {
    const utils = await import('./utils');
    const converter = (char: string) => char.charCodeAt(0);

    utils.setToSJISFunction(converter);

    expect(utils.isKanjiModeEnabled()).toBe(true);
    expect(utils.toSJIS('A')).toBe(65);
  });

  it('refuses anything that is not a function', () => {
    expect(() => setToSJISFunction('nope' as unknown as (d: string) => number)).toThrow(
      /not a valid function/,
    );
    expect(() => setToSJISFunction(undefined as unknown as (d: string) => number)).toThrow();
  });

  it('routes conversion through whichever function was registered last', () => {
    setToSJISFunction(() => 1);
    setToSJISFunction(() => 2);
    expect(toSJIS('x')).toBe(2);
  });

  it('stays enabled once enabled', () => {
    setToSJISFunction((c: string) => c.charCodeAt(0));
    expect(isKanjiModeEnabled()).toBe(true);
  });
});
