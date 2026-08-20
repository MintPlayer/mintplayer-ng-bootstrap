import { describe, expect, it } from 'vitest';

import { getSymbolSize } from './get-symbol-size';
import { toSJIS } from './to-sjis';

/**
 * The optional helpers a consumer imports directly. `to-sjis` is the big one:
 * it is the Shift-JIS lookup table Kanji mode needs, kept out of the encoder so
 * an application that never encodes Japanese does not pay for it — the table is
 * several times the size of the rest of the library.
 */

describe('getSymbolSize', () => {
  it('follows the 4N+17 rule', () => {
    expect(getSymbolSize(1)).toBe(21);
    expect(getSymbolSize(40)).toBe(177);
  });

  it.each([0, -1, 41, undefined])('refuses version %s', (version) => {
    expect(() => getSymbolSize(version as number)).toThrow();
  });

  // Same rule as the copy inside `core/utils.ts`; if the two ever disagree, one
  // caller sizes its matrix differently from another.
  it('agrees with the core implementation at every version', async () => {
    const core = await import('../../core/utils');
    for (let version = 1; version <= 40; version++) {
      expect(getSymbolSize(version), `v${version}`).toBe(core.getSymbolSize(version));
    }
  });
});

describe('toSJIS', () => {
  // The two Shift-JIS ranges QR Kanji mode accepts are 0x8140–0x9FFC and
  // 0xE040–0xEBBF; a value outside them cannot be encoded in Kanji mode at all.
  const inKanjiRange = (value: number) =>
    (value >= 0x8140 && value <= 0x9ffc) || (value >= 0xe040 && value <= 0xebbf);

  it('maps a Kanji character into the Shift-JIS range', () => {
    const value = toSJIS('漢')!;
    expect(value).toBeGreaterThanOrEqual(0x8140);
    expect(inKanjiRange(value)).toBe(true);
  });

  it('maps hiragana and katakana', () => {
    expect(inKanjiRange(toSJIS('あ')!)).toBe(true);
    expect(inKanjiRange(toSJIS('ア')!)).toBe(true);
  });

  it('maps the full-width Latin letters, which are Kanji-mode characters', () => {
    expect(toSJIS('Ａ')).toBe(0x8260);
    expect(toSJIS('Ｚ')).toBe(0x8260 + 25);
  });

  it('maps the full-width digits', () => {
    expect(toSJIS('０')).toBe(0x824f);
    expect(toSJIS('９')).toBe(0x824f + 9);
  });

  it('maps Greek and Cyrillic, which the Shift-JIS table also carries', () => {
    expect(toSJIS('Α')).toBe(0x839f);
    expect(toSJIS('А')).toBe(0x8440);
  });

  /*
   * Half-width ASCII is NOT in the table, and that is correct rather than a
   * gap: plain `A` belongs in alphanumeric or byte mode, and the full-width
   * `Ａ` is a different character with a different code point. Returning
   * `undefined` is what makes `KanjiData.write` refuse it loudly instead of
   * encoding something else.
   */
  it.each(['A', '1', ' ', '#'])('has no mapping for the half-width character %s', (char) => {
    expect(toSJIS(char)).toBeUndefined();
  });

  it('has no mapping for an emoji', () => {
    expect(toSJIS('😀')).toBeUndefined();
  });

  it('reports nothing for an empty input', () => {
    expect(toSJIS('')).toBeUndefined();
    expect(toSJIS(undefined as unknown as string)).toBeUndefined();
  });

  // Every character it does map has to land in a range Kanji mode accepts, or
  // `KanjiData.write` throws on a character the table claimed to know.
  it('never returns a value outside the two encodable ranges', () => {
    const samples = 'あアΑА漢字日本語　、。ＡＺ０９〒→←';
    for (const char of samples) {
      const value = toSJIS(char);
      expect(value, char).toBeDefined();
      expect(inKanjiRange(value!), `${char} -> ${value?.toString(16)}`).toBe(true);
    }
  });

  it('maps distinct characters to distinct values', () => {
    const samples = [...'あいうえおアイウエオ漢字日本語'];
    const values = samples.map((c) => toSJIS(c));
    expect(new Set(values).size).toBe(samples.length);
  });
});
