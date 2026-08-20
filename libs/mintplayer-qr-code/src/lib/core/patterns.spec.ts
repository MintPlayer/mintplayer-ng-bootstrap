import { describe, expect, it } from 'vitest';

import * as AlignmentPattern from './alignment-pattern';
import * as FinderPattern from './finder-pattern';
import * as FormatInfo from './format-info';
import * as ECLevel from './error-correction-level';
import { getEncodedBits as getVersionBits } from './version';
import { getSymbolSize } from './utils';

/**
 * The function patterns — the parts of a symbol that carry no data but tell a
 * scanner where everything is — and the two BCH-protected metadata fields.
 *
 * All of it is fixed by ISO/IEC 18004, so the tests assert the standard rather
 * than the implementation. That matters more here than anywhere else in the
 * library: a misplaced alignment pattern or a wrong format-info bit produces a
 * symbol that renders perfectly, looks exactly like a QR code, and cannot be
 * read by anything.
 */

const hammingDistance = (a: number, b: number): number => {
  let bits = a ^ b;
  let count = 0;
  while (bits) {
    count += bits & 1;
    bits >>>= 1;
  }
  return count;
};

describe('finder patterns', () => {
  // Three of them, one per corner except bottom-right — the asymmetry is what
  // lets a scanner work out the symbol's rotation.
  it('places three, leaving the bottom-right corner free', () => {
    expect(FinderPattern.getPositions(1)).toEqual([
      [0, 0],
      [14, 0],
      [0, 14],
    ]);
  });

  it('keeps them in the corners as the symbol grows', () => {
    for (const version of [1, 7, 20, 40]) {
      const size = getSymbolSize(version);
      expect(FinderPattern.getPositions(version), `v${version}`).toEqual([
        [0, 0],
        [size - 7, 0],
        [0, size - 7],
      ]);
    }
  });

  it('always places exactly three', () => {
    for (let version = 1; version <= 40; version++) {
      expect(FinderPattern.getPositions(version), `v${version}`).toHaveLength(3);
    }
  });
});

describe('alignment patterns', () => {
  // Annex E. Version 1 has none — the symbol is small enough that the finders
  // alone fix the grid.
  it('places none in a version 1 symbol', () => {
    expect(AlignmentPattern.getRowColCoords(1)).toEqual([]);
    expect(AlignmentPattern.getPositions(1)).toEqual([]);
  });

  it.each([
    [2, [6, 18]],
    [7, [6, 22, 38]],
    [32, [6, 34, 60, 86, 112, 138]],
  ])('matches the standard row/column coordinates for version %i', (version, expected) => {
    expect(AlignmentPattern.getRowColCoords(version)).toEqual(expected);
  });

  /*
   * Version 32 is the reason the code carries a `size === 145` special case.
   * The general interval formula gives 28 there, which would put the patterns
   * at 6, 32, 60, 88, 116, 138 — uneven at the first gap and wrong against
   * Annex E. It is the single exception in the whole table.
   */
  it('honours the version 32 exception the formula cannot express', () => {
    const coords = AlignmentPattern.getRowColCoords(32);
    const gaps = coords.slice(2).map((c, i) => c - coords[i + 1]);
    expect(new Set(gaps).size).toBe(1);
    expect(gaps[0]).toBe(26);
  });

  it('always starts at 6 and ends seven modules from the far edge', () => {
    for (let version = 2; version <= 40; version++) {
      const coords = AlignmentPattern.getRowColCoords(version);
      expect(coords[0], `v${version}`).toBe(6);
      expect(coords.at(-1), `v${version}`).toBe(getSymbolSize(version) - 7);
    }
  });

  it('spaces them evenly except possibly at the first gap', () => {
    for (let version = 2; version <= 40; version++) {
      const coords = AlignmentPattern.getRowColCoords(version);
      const gaps = coords.slice(2).map((c, i) => c - coords[i + 1]);
      expect(new Set(gaps).size, `v${version} gaps ${gaps}`).toBeLessThanOrEqual(1);
    }
  });

  // The three corners are already occupied by finder patterns, so the grid of
  // n x n coordinates yields n² - 3 actual alignment patterns.
  it('skips the three corners the finders occupy', () => {
    for (let version = 2; version <= 40; version++) {
      const n = AlignmentPattern.getRowColCoords(version).length;
      expect(AlignmentPattern.getPositions(version), `v${version}`).toHaveLength(n * n - 3);
    }
  });

  it('never overlaps a finder pattern', () => {
    for (let version = 2; version <= 40; version++) {
      const size = getSymbolSize(version);
      for (const [row, col] of AlignmentPattern.getPositions(version)) {
        const inFinder =
          (row <= 8 && col <= 8) || (row <= 8 && col >= size - 9) || (row >= size - 9 && col <= 8);
        expect(inFinder, `v${version} at ${row},${col}`).toBe(false);
      }
    }
  });

  it('keeps every pattern inside the symbol', () => {
    for (let version = 2; version <= 40; version++) {
      const size = getSymbolSize(version);
      for (const [row, col] of AlignmentPattern.getPositions(version)) {
        expect(row - 2, `v${version}`).toBeGreaterThanOrEqual(0);
        expect(col - 2, `v${version}`).toBeGreaterThanOrEqual(0);
        expect(row + 2, `v${version}`).toBeLessThan(size);
        expect(col + 2, `v${version}`).toBeLessThan(size);
      }
    }
  });
});

describe('format information', () => {
  const LEVELS = [ECLevel.L, ECLevel.M, ECLevel.Q, ECLevel.H];
  const all = LEVELS.flatMap((level) =>
    [0, 1, 2, 3, 4, 5, 6, 7].map((mask) => FormatInfo.getEncodedBits(level, mask)),
  );

  it('produces a 15-bit value', () => {
    for (const bits of all) {
      expect(bits).toBeGreaterThanOrEqual(0);
      expect(bits).toBeLessThan(1 << 15);
    }
  });

  it('produces a distinct value for each of the 32 combinations', () => {
    expect(all).toHaveLength(32);
    expect(new Set(all).size).toBe(32);
  });

  /*
   * The mask exists for exactly this. Without it the (M, mask 0) combination
   * would encode as fifteen zeros — an all-light run a scanner cannot
   * distinguish from blank quiet zone, in the one region it must read before
   * it can read anything else.
   */
  it('never produces an all-zero string', () => {
    expect(all.every((bits) => bits !== 0)).toBe(true);
    expect(FormatInfo.getEncodedBits(ECLevel.M, 0)).not.toBe(0);
  });

  /*
   * The format information is a BCH(15,5) code, whose minimum Hamming distance
   * is 7 — which is what lets a scanner recover the level and mask through up
   * to three damaged modules. XOR-ing every codeword with the same constant
   * mask preserves distances, so the property survives the masking step.
   */
  it('keeps every pair at least 7 bits apart, as BCH(15,5) requires', () => {
    let minimum = Infinity;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        minimum = Math.min(minimum, hammingDistance(all[i], all[j]));
      }
    }
    expect(minimum).toBe(7);
  });

  it('is deterministic', () => {
    expect(FormatInfo.getEncodedBits(ECLevel.Q, 5)).toBe(FormatInfo.getEncodedBits(ECLevel.Q, 5));
  });
});

describe('version information', () => {
  // Only versions 7 and up carry it — below that a scanner infers the version
  // from the module count alone.
  it.each([1, 6])('refuses version %i, which carries no version block', (version) => {
    expect(() => getVersionBits(version)).toThrow(/Invalid QR Code version/);
  });

  it('refuses a version outside the range entirely', () => {
    expect(() => getVersionBits(41)).toThrow();
    expect(() => getVersionBits(0)).toThrow();
  });

  // The canonical anchor from Annex D: version 7 encodes as 000111110010010100.
  it('encodes version 7 as the standard says', () => {
    expect(getVersionBits(7)).toBe(0x07c94);
  });

  it('produces an 18-bit value carrying the version in its top six bits', () => {
    for (let version = 7; version <= 40; version++) {
      const bits = getVersionBits(version);
      expect(bits, `v${version}`).toBeLessThan(1 << 18);
      expect(bits >> 12, `v${version}`).toBe(version);
    }
  });

  it('produces a distinct value per version', () => {
    const all = Array.from({ length: 34 }, (_unused, i) => getVersionBits(i + 7));
    expect(new Set(all).size).toBe(34);
  });

  /*
   * BCH(18,6), minimum distance 8 — three correctable errors, matching what the
   * standard promises for the version block. The version block sits right next
   * to the symbol edge where damage is most likely, which is why it is
   * protected more heavily than the format block.
   */
  it('keeps every pair at least 8 bits apart, as BCH(18,6) requires', () => {
    const all = Array.from({ length: 34 }, (_unused, i) => getVersionBits(i + 7));
    let minimum = Infinity;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        minimum = Math.min(minimum, hammingDistance(all[i], all[j]));
      }
    }
    expect(minimum).toBeGreaterThanOrEqual(8);
  });
});
