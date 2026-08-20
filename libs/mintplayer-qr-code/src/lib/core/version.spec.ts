import { describe, expect, it } from 'vitest';

import * as Version from './version';
import * as Mode from './mode';
import * as ECLevel from './error-correction-level';
import * as ECCode from './error-correction-code';
import { NumericData } from './data-types/numeric-data';
import { ByteData } from './data-types/byte-data';
import { getSymbolTotalCodewords } from './utils';

/**
 * Version selection: how much data fits in each symbol size, and which is the
 * smallest that will hold what the consumer asked to encode.
 *
 * The capacity numbers in this file are the ones from ISO/IEC 18004 Table 7 —
 * the same figures every QR reference publishes — so they test the two big
 * lookup tables (`CODEWORDS_COUNT` and the EC codeword table) end to end. A
 * single mistyped entry there produces a symbol whose data section is the wrong
 * size, which no scanner can read and no unit test of the surrounding code
 * would notice.
 */

const capacity = (version: number, level: ECLevel.ErrorCorrectionLevel, mode: Mode.Mode) =>
  Version.getCapacity(version, level, mode);

describe('getCapacity — against the standard capacity table', () => {
  // Table 7, version 1, all four levels and all four modes.
  it.each([
    ['L', ECLevel.L, 41, 25, 17, 10],
    ['M', ECLevel.M, 34, 20, 14, 8],
    ['Q', ECLevel.Q, 27, 16, 11, 7],
    ['H', ECLevel.H, 17, 10, 7, 4],
  ])('version 1 at level %s holds %i/%i/%i/%i characters', (_name, level, num, alnum, byte, kanji) => {
    expect(capacity(1, level, Mode.NUMERIC)).toBe(num);
    expect(capacity(1, level, Mode.ALPHANUMERIC)).toBe(alnum);
    expect(capacity(1, level, Mode.BYTE)).toBe(byte);
    expect(capacity(1, level, Mode.KANJI)).toBe(kanji);
  });

  // The other end of the table — the largest symbol there is.
  it('version 40 at level L holds the documented maximum', () => {
    expect(capacity(40, ECLevel.L, Mode.NUMERIC)).toBe(7089);
    expect(capacity(40, ECLevel.L, Mode.ALPHANUMERIC)).toBe(4296);
    expect(capacity(40, ECLevel.L, Mode.BYTE)).toBe(2953);
    expect(capacity(40, ECLevel.L, Mode.KANJI)).toBe(1817);
  });

  it('version 40 at level H holds the documented minimum for that size', () => {
    expect(capacity(40, ECLevel.H, Mode.NUMERIC)).toBe(3057);
    expect(capacity(40, ECLevel.H, Mode.BYTE)).toBe(1273);
  });

  // Density ordering, which is the whole reason four modes exist.
  it('holds strictly more the narrower the mode', () => {
    for (const version of [1, 10, 25, 40]) {
      const num = capacity(version, ECLevel.M, Mode.NUMERIC);
      const alnum = capacity(version, ECLevel.M, Mode.ALPHANUMERIC);
      const byte = capacity(version, ECLevel.M, Mode.BYTE);
      expect(num, `v${version}`).toBeGreaterThan(alnum);
      expect(alnum, `v${version}`).toBeGreaterThan(byte);
    }
  });

  // Stronger correction means more of the symbol is EC codewords, so less is
  // left for payload. L > M > Q > H at every size.
  it('holds strictly less the stronger the correction', () => {
    for (const version of [1, 10, 40]) {
      const l = capacity(version, ECLevel.L, Mode.BYTE);
      const m = capacity(version, ECLevel.M, Mode.BYTE);
      const q = capacity(version, ECLevel.Q, Mode.BYTE);
      const h = capacity(version, ECLevel.H, Mode.BYTE);
      expect(l, `v${version}`).toBeGreaterThan(m);
      expect(m, `v${version}`).toBeGreaterThan(q);
      expect(q, `v${version}`).toBeGreaterThan(h);
    }
  });

  it('grows monotonically with version', () => {
    for (let version = 2; version <= 40; version++) {
      expect(capacity(version, ECLevel.M, Mode.BYTE), `v${version}`).toBeGreaterThan(
        capacity(version - 1, ECLevel.M, Mode.BYTE),
      );
    }
  });

  // MIXED asks for the raw data-bit budget rather than a character count,
  // because a multi-segment payload has no single per-character cost.
  it('reports raw data bits for a mixed payload', () => {
    expect(capacity(1, ECLevel.L, Mode.MIXED)).toBe((26 - 7) * 8);
  });

  it('refuses an invalid version', () => {
    expect(() => capacity(0, ECLevel.L, Mode.BYTE)).toThrow(/Invalid QR Code version/);
    expect(() => capacity(41, ECLevel.L, Mode.BYTE)).toThrow();
  });
});

describe('the error-correction codeword tables', () => {
  it.each([
    [1, ECLevel.L, 7],
    [1, ECLevel.M, 10],
    [1, ECLevel.Q, 13],
    [1, ECLevel.H, 17],
    [40, ECLevel.L, 750],
    [40, ECLevel.H, 2430],
  ])('version %i level %s reserves %i EC codewords', (version, level, expected) => {
    expect(ECCode.getTotalCodewordsCount(version, level)).toBe(expected);
  });

  /*
   * The block counts are TOTALS across both groups, which is the trap in
   * reading Table 9: it lists a symbol as "19 blocks of 118 plus 6 blocks of
   * 119", and the number this function returns is 25, not 19. Taking the first
   * group's count as the total gives blocks that are too large, and the
   * interleaving then runs off the end of the buffer.
   */
  it.each([
    [1, ECLevel.L, 1],
    [1, ECLevel.H, 1],
    [5, ECLevel.Q, 4],
    [40, ECLevel.L, 25],
    [40, ECLevel.H, 81],
  ])('version %i level %s splits into %i blocks', (version, level, expected) => {
    expect(ECCode.getBlocksCount(version, level)).toBe(expected);
  });

  // EC codewords can never exceed the symbol, and the leftover is what the
  // payload gets — a table entry larger than the symbol would make the data
  // section negative.
  it('never reserves more EC codewords than the symbol holds', () => {
    for (let version = 1; version <= 40; version++) {
      for (const level of [ECLevel.L, ECLevel.M, ECLevel.Q, ECLevel.H]) {
        const ec = ECCode.getTotalCodewordsCount(version, level)!;
        expect(ec, `v${version}`).toBeGreaterThan(0);
        expect(ec, `v${version}`).toBeLessThan(getSymbolTotalCodewords(version));
      }
    }
  });

  // Every block must get at least one EC codeword, or Reed–Solomon has nothing
  // to work with for that block.
  it('gives every block at least one EC codeword', () => {
    for (let version = 1; version <= 40; version++) {
      for (const level of [ECLevel.L, ECLevel.M, ECLevel.Q, ECLevel.H]) {
        const ec = ECCode.getTotalCodewordsCount(version, level)!;
        const blocks = ECCode.getBlocksCount(version, level)!;
        expect(Math.floor(ec / blocks), `v${version}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('reports nothing for a level it does not recognise', () => {
    expect(ECCode.getTotalCodewordsCount(1, { bit: 99 })).toBeUndefined();
    expect(ECCode.getBlocksCount(1, { bit: 99 })).toBeUndefined();
  });
});

describe('isValid and from', () => {
  it('accepts the whole documented range', () => {
    expect(Version.isValid(1)).toBeTruthy();
    expect(Version.isValid(40)).toBeTruthy();
  });

  it.each([0, 41, -1, NaN, undefined])('rejects %s', (version) => {
    expect(Version.isValid(version as number)).toBeFalsy();
  });

  it('falls back for an invalid version rather than throwing', () => {
    expect(Version.from(0, 5)).toBe(5);
    expect(Version.from(undefined, 5)).toBe(5);
  });

  it('keeps a valid version', () => {
    expect(Version.from(12, 5)).toBe(12);
  });

  it('may fall back to nothing at all, meaning "choose for me"', () => {
    expect(Version.from(99, undefined)).toBeUndefined();
  });
});

describe('getBestVersionForData', () => {
  const numeric = (length: number) => new NumericData('1'.repeat(length));
  const bytes = (length: number) => new ByteData('a'.repeat(length));

  // Smallest symbol that fits: a version-1 payload must not silently land in a
  // version 2 symbol, which would be 25x25 instead of 21x21 for no reason.
  it('picks version 1 for what version 1 can hold', () => {
    expect(Version.getBestVersionForData([numeric(41)], ECLevel.L)).toBe(1);
    expect(Version.getBestVersionForData([bytes(17)], ECLevel.L)).toBe(1);
  });

  it('steps up as soon as the payload no longer fits', () => {
    expect(Version.getBestVersionForData([numeric(42)], ECLevel.L)).toBe(2);
    expect(Version.getBestVersionForData([bytes(18)], ECLevel.L)).toBe(2);
  });

  it('steps up when the correction level rises rather than truncating', () => {
    expect(Version.getBestVersionForData([bytes(17)], ECLevel.L)).toBe(1);
    expect(Version.getBestVersionForData([bytes(17)], ECLevel.H)).toBeGreaterThan(1);
  });

  it('reports nothing when no symbol is big enough', () => {
    expect(Version.getBestVersionForData([bytes(3000)], ECLevel.H)).toBeUndefined();
  });

  it('treats an empty payload as version 1', () => {
    expect(Version.getBestVersionForData([], ECLevel.M)).toBe(1);
  });

  it('accepts a bare segment as well as an array', () => {
    expect(
      Version.getBestVersionForData(numeric(10) as unknown as NumericData[], ECLevel.L),
    ).toBe(1);
  });

  // Several segments cost a mode indicator and a character count each, so the
  // mixed path budgets in bits rather than characters.
  it('accounts for the per-segment overhead of a mixed payload', () => {
    const single = Version.getBestVersionForData([bytes(100)], ECLevel.L)!;
    const split = Version.getBestVersionForMixedData(
      [bytes(50), numeric(10), bytes(50)],
      ECLevel.L,
    )!;
    expect(split).toBeGreaterThanOrEqual(single);
  });

  it('defaults an unrecognised correction level to M rather than failing', () => {
    expect(Version.getBestVersionForData([bytes(14)], { bit: 99 })).toBe(1);
  });
});

describe('the per-segment bit budget', () => {
  // Mode indicator (4 bits) + character count indicator, which is the fixed
  // overhead every segment pays before any payload.
  it('charges four bits plus the character count indicator', () => {
    expect(Version.getReservedBitsCount(Mode.NUMERIC, 1)).toBe(14);
    expect(Version.getReservedBitsCount(Mode.BYTE, 10)).toBe(20);
  });

  it('totals the segments and their overheads', () => {
    const segments = [new NumericData('123'), new ByteData('ab')];
    const total = Version.getTotalBitsFromDataArray(segments, 1);

    expect(total).toBe(14 + 10 + 12 + 16);
  });

  it('totals nothing for no segments', () => {
    expect(Version.getTotalBitsFromDataArray([], 1)).toBe(0);
  });
});
