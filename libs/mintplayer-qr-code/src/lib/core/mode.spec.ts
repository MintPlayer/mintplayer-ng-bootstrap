import { describe, expect, it } from 'vitest';

import * as Mode from './mode';
import { testAlphanumeric, testKanji, testNumeric } from './regex';

/**
 * The four encoding modes, their 4-bit indicators, and the rule for choosing
 * one.
 *
 * Two things here come straight from ISO/IEC 18004 and are not this
 * implementation's to choose: the mode indicator values (Table 2) and the
 * character-count-indicator widths, which change at versions 10 and 27
 * (Table 3). A wrong width shifts every subsequent bit in the payload, so the
 * symbol encodes cleanly and decodes to nothing.
 *
 * Mode SELECTION is the other half. Modes are ordered by density — numeric
 * packs 3 characters into 10 bits, byte needs 8 bits per character — so
 * choosing the narrowest applicable mode is what keeps a symbol small enough
 * to stay in a low version.
 */

describe('the mode indicators', () => {
  // Table 2: 0001 numeric, 0010 alphanumeric, 0100 byte, 1000 kanji.
  it.each([
    ['numeric', Mode.NUMERIC, 0b0001],
    ['alphanumeric', Mode.ALPHANUMERIC, 0b0010],
    ['byte', Mode.BYTE, 0b0100],
    ['kanji', Mode.KANJI, 0b1000],
  ])('%s is %s', (_name, mode, bit) => {
    expect(mode.bit).toBe(bit);
  });

  it('gives each mode a distinct single-bit indicator', () => {
    const bits = [Mode.NUMERIC, Mode.ALPHANUMERIC, Mode.BYTE, Mode.KANJI].map((m) => m.bit);
    expect(new Set(bits).size).toBe(4);
    expect(bits.every((b) => (b & (b - 1)) === 0)).toBe(true);
  });

  // MIXED is not a real mode — it is the marker that says "this symbol carries
  // several segments", and it deliberately fails `isValid` so nothing can write
  // it into a bit stream as an indicator.
  it('keeps MIXED out of the valid modes', () => {
    expect(Mode.isValid(Mode.MIXED)).toBeFalsy();
    expect(Mode.MIXED.ccBits).toBeUndefined();
  });
});

describe('getCharCountIndicator', () => {
  // Table 3. The widths step at version 10 and again at version 27.
  it.each([
    [Mode.NUMERIC, 1, 10],
    [Mode.NUMERIC, 10, 12],
    [Mode.NUMERIC, 27, 14],
    [Mode.ALPHANUMERIC, 1, 9],
    [Mode.ALPHANUMERIC, 10, 11],
    [Mode.ALPHANUMERIC, 27, 13],
    [Mode.BYTE, 1, 8],
    [Mode.BYTE, 10, 16],
    [Mode.BYTE, 27, 16],
    [Mode.KANJI, 1, 8],
    [Mode.KANJI, 10, 10],
    [Mode.KANJI, 27, 12],
  ])('is %o bits wide at version %i', (mode, version, expected) => {
    expect(Mode.getCharCountIndicator(mode, version)).toBe(expected);
  });

  // The boundaries themselves, because an off-by-one in the `< 10` / `< 27`
  // comparisons is invisible everywhere else.
  it('changes width at exactly version 10 and version 27', () => {
    expect(Mode.getCharCountIndicator(Mode.NUMERIC, 9)).toBe(10);
    expect(Mode.getCharCountIndicator(Mode.NUMERIC, 10)).toBe(12);
    expect(Mode.getCharCountIndicator(Mode.NUMERIC, 26)).toBe(12);
    expect(Mode.getCharCountIndicator(Mode.NUMERIC, 27)).toBe(14);
  });

  it('holds the widest width to version 40', () => {
    expect(Mode.getCharCountIndicator(Mode.BYTE, 40)).toBe(16);
  });

  it.each([0, 41, -1])('refuses version %i', (version) => {
    expect(() => Mode.getCharCountIndicator(Mode.NUMERIC, version)).toThrow(/Invalid version/);
  });

  it('refuses a mode that carries no widths', () => {
    expect(() => Mode.getCharCountIndicator(Mode.MIXED, 1)).toThrow(/Invalid mode/);
  });
});

describe('getBestModeForData', () => {
  // Narrowest applicable mode wins, because narrower means denser: numeric
  // fits 3 characters in 10 bits where byte needs 24.
  it('reads digits as numeric', () => {
    expect(Mode.getBestModeForData('0123456789')).toBe(Mode.NUMERIC);
  });

  it('reads the alphanumeric character set as alphanumeric', () => {
    expect(Mode.getBestModeForData('HELLO WORLD')).toBe(Mode.ALPHANUMERIC);
    expect(Mode.getBestModeForData('A$%*+-./:')).toBe(Mode.ALPHANUMERIC);
  });

  // The alphanumeric set is 45 characters and does NOT include lower case —
  // one lower-case letter forces the whole string to byte mode, which is the
  // single most common reason a QR code is larger than expected.
  it('drops to byte mode for lower case', () => {
    expect(Mode.getBestModeForData('hello')).toBe(Mode.BYTE);
    expect(Mode.getBestModeForData('Hello World')).toBe(Mode.BYTE);
  });

  it('drops to byte mode for punctuation outside the set', () => {
    expect(Mode.getBestModeForData('A,B')).toBe(Mode.BYTE);
    expect(Mode.getBestModeForData('https://example.com')).toBe(Mode.BYTE);
  });

  it('reads Kanji as Kanji', () => {
    expect(Mode.getBestModeForData('漢字')).toBe(Mode.KANJI);
  });

  // Numeric is a subset of alphanumeric and both are subsets of byte, so the
  // ordering of the tests inside the function is what makes it pick the
  // narrowest rather than merely a valid one.
  it('prefers numeric over alphanumeric for a digit string', () => {
    expect(testAlphanumeric('123')).toBe(true);
    expect(Mode.getBestModeForData('123')).toBe(Mode.NUMERIC);
  });
});

describe('fromString', () => {
  it.each([
    ['numeric', Mode.NUMERIC],
    ['alphanumeric', Mode.ALPHANUMERIC],
    ['kanji', Mode.KANJI],
    ['byte', Mode.BYTE],
  ])('parses %s', (name, expected) => {
    expect(Mode.fromString(name)).toBe(expected);
  });

  it('ignores case', () => {
    expect(Mode.fromString('NUMERIC')).toBe(Mode.NUMERIC);
    expect(Mode.fromString('Byte')).toBe(Mode.BYTE);
  });

  it('refuses an unknown name', () => {
    expect(() => Mode.fromString('quaternary')).toThrow(/Unknown mode/);
  });

  it('refuses a non-string', () => {
    expect(() => Mode.fromString(7 as unknown as string)).toThrow(/not a string/);
  });
});

describe('from — the forgiving parser the public API uses', () => {
  // Consumer input, so it falls back rather than throwing: a mistyped mode
  // should still produce a scannable code, just not the compact one asked for.
  it('falls back for an unknown name', () => {
    expect(Mode.from('quaternary', Mode.BYTE)).toBe(Mode.BYTE);
  });

  it('falls back for nothing at all', () => {
    expect(Mode.from(null, Mode.NUMERIC)).toBe(Mode.NUMERIC);
    expect(Mode.from(undefined as unknown as null, Mode.NUMERIC)).toBe(Mode.NUMERIC);
  });

  it('falls back for a mode object that is not one of the four', () => {
    expect(Mode.from({ bit: 99 } as Mode.Mode, Mode.BYTE)).toBe(Mode.BYTE);
    expect(Mode.from(Mode.MIXED, Mode.BYTE)).toBe(Mode.BYTE);
  });

  it('accepts a real mode object unchanged', () => {
    expect(Mode.from(Mode.KANJI, Mode.BYTE)).toBe(Mode.KANJI);
  });

  it('accepts a name', () => {
    expect(Mode.from('alphanumeric', Mode.BYTE)).toBe(Mode.ALPHANUMERIC);
  });
});

describe('toString', () => {
  it('names each mode', () => {
    expect(Mode.toString(Mode.NUMERIC)).toBe('Numeric');
    expect(Mode.toString(Mode.KANJI)).toBe('Kanji');
  });

  it('refuses a mode with no name', () => {
    expect(() => Mode.toString(Mode.MIXED)).toThrow(/Invalid mode/);
  });
});

describe('the character-set tests behind mode selection', () => {
  it('accepts only digits as numeric', () => {
    expect(testNumeric('0123456789')).toBe(true);
    expect(testNumeric('12a')).toBe(false);
    expect(testNumeric('')).toBe(false);
    expect(testNumeric('1.2')).toBe(false);
  });

  // The 45-character alphanumeric set: digits, upper case, space, and
  // `$ % * + - . / :` — and nothing else.
  it('accepts exactly the 45-character alphanumeric set', () => {
    expect(testAlphanumeric('ABCXYZ0189 $%*+-./:')).toBe(true);
    expect(testAlphanumeric('a')).toBe(false);
    expect(testAlphanumeric('#')).toBe(false);
    expect(testAlphanumeric('')).toBe(false);
  });

  it('accepts Kanji and rejects Latin', () => {
    expect(testKanji('漢字')).toBe(true);
    expect(testKanji('ABC')).toBe(false);
  });

  it('requires the WHOLE string to match, not merely part of it', () => {
    expect(testNumeric('123abc')).toBe(false);
    expect(testAlphanumeric('ABC#')).toBe(false);
    expect(testKanji('漢字ABC')).toBe(false);
  });
});
