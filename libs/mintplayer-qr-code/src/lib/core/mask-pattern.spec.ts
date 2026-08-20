import { describe, expect, it, vi } from 'vitest';

import * as MaskPattern from './mask-pattern';
import { BitMatrix } from './bit-matrix';

/**
 * Masking, and the penalty scoring that chooses a mask.
 *
 * A QR symbol is XOR-ed with one of eight fixed patterns before it is drawn,
 * for one reason: to break up large blank areas and anything resembling a
 * finder pattern, both of which confuse a scanner. Which of the eight is used
 * is decided by scoring all eight against four penalty rules and taking the
 * lowest — clause 7.8.3 — so these rules are not heuristics this library chose,
 * they are the standard's.
 *
 * The eight mask FORMULAS (Table 10) are the part that must be exact. A wrong
 * one still produces a symbol, still records its number in the format
 * information, and decodes to noise because the scanner un-masks with the
 * pattern the format bits named rather than the one that was applied.
 */

const filled = (size: number, value: (row: number, col: number) => boolean): BitMatrix => {
  const matrix = new BitMatrix(size);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      matrix.set(row, col, value(row, col), false);
    }
  }
  return matrix;
};

/** Which modules a given mask flips, read back through `applyMask`. */
const maskShape = (pattern: number, size = 8): boolean[][] => {
  const matrix = filled(size, () => false);
  MaskPattern.applyMask(pattern, matrix);
  return Array.from({ length: size }, (_unused, row) =>
    Array.from({ length: size }, (_unused2, col) => matrix.get(row, col) === 1),
  );
};

describe('the eight mask formulas', () => {
  // Table 10, expressed as the condition under which a module is inverted.
  it.each([
    [0, (i: number, j: number) => (i + j) % 2 === 0],
    [1, (i: number) => i % 2 === 0],
    [2, (_i: number, j: number) => j % 3 === 0],
    [3, (i: number, j: number) => (i + j) % 3 === 0],
    [4, (i: number, j: number) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0],
    [5, (i: number, j: number) => ((i * j) % 2) + ((i * j) % 3) === 0],
    [6, (i: number, j: number) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0],
    [7, (i: number, j: number) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0],
  ])('mask %i matches the formula in the standard', (pattern, formula) => {
    const shape = maskShape(pattern);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        expect(shape[row][col], `mask ${pattern} at ${row},${col}`).toBe(formula(row, col));
      }
    }
  });

  it('offers exactly eight patterns', () => {
    expect(Object.keys(MaskPattern.Patterns)).toHaveLength(8);
    expect(Object.values(MaskPattern.Patterns)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  // Eight distinct patterns, or the mask choice would sometimes be a coin flip
  // between two identical options.
  it('gives each pattern a distinct shape', () => {
    const shapes = [0, 1, 2, 3, 4, 5, 6, 7].map((p) => JSON.stringify(maskShape(p, 12)));
    expect(new Set(shapes).size).toBe(8);
  });

  it('refuses a pattern number outside the eight', () => {
    const matrix = filled(4, () => false);
    expect(() => MaskPattern.applyMask(8, matrix)).toThrow(/bad maskPattern/);
  });
});

describe('applyMask', () => {
  it('is its own inverse, which is how the mask is undone', () => {
    const matrix = filled(9, (row, col) => (row * col) % 3 === 0);
    const before = [...matrix.data];

    MaskPattern.applyMask(3, matrix);
    MaskPattern.applyMask(3, matrix);

    expect(matrix.data).toEqual(before);
  });

  /*
   * Function modules are skipped. The finder patterns, timing patterns,
   * alignment patterns and format information are how a scanner locates and
   * orients the symbol in the first place — masking them would leave nothing to
   * find, and the symbol would not be recognised as a QR code at all.
   */
  it('never touches a reserved module', () => {
    const matrix = filled(9, () => false);
    matrix.set(0, 0, true, true);
    matrix.set(4, 4, false, true);

    MaskPattern.applyMask(0, matrix);

    expect(matrix.get(0, 0)).toBe(1);
    expect(matrix.get(4, 4)).toBe(0);
  });

  it('does touch every unreserved module the formula selects', () => {
    const matrix = filled(6, () => false);
    MaskPattern.applyMask(1, matrix);

    expect(matrix.get(0, 0)).toBe(1);
    expect(matrix.get(1, 0)).toBe(0);
  });
});

describe('the penalty rules', () => {
  /*
   * Rule 1 (N1 = 3): a run of five same-coloured modules scores 3, and every
   * module beyond the fifth adds one more.
   *
   * Asserted on solid squares, where the whole score is computable by hand: a
   * 5x5 has ten runs of exactly five (five rows, five columns) at 3 each, and a
   * 6x6 has twelve runs of six at 3+1 each. Comparing two partially-filled
   * grids does NOT work — the light area around a short run scores too, and at
   * 7x7 a five-run and a six-run come to the same 63 by coincidence.
   */
  it('scores three for a run of exactly five', () => {
    expect(MaskPattern.getPenaltyN1(filled(5, () => true))).toBe(10 * 3);
  });

  it('adds one for each module past the fifth', () => {
    expect(MaskPattern.getPenaltyN1(filled(6, () => true))).toBe(12 * (3 + 1));
    expect(MaskPattern.getPenaltyN1(filled(7, () => true))).toBe(14 * (3 + 2));
  });

  it('scores a light run exactly as it scores a dark one', () => {
    expect(MaskPattern.getPenaltyN1(filled(5, () => false))).toBe(
      MaskPattern.getPenaltyN1(filled(5, () => true)),
    );
  });

  it('leaves a checkerboard, which has no run longer than one, unpenalised', () => {
    expect(MaskPattern.getPenaltyN1(filled(9, (row, col) => (row + col) % 2 === 0))).toBe(0);
  });

  it('scores runs in both directions', () => {
    const rows = filled(10, (row) => row < 5);
    const cols = filled(10, (_row, col) => col < 5);
    expect(MaskPattern.getPenaltyN1(rows)).toBe(MaskPattern.getPenaltyN1(cols));
  });

  // Rule 2 (N2 = 3): every 2x2 block of one colour scores 3. A blank symbol is
  // the worst case — (n-1)² blocks.
  it('penalises every solid 2x2 block', () => {
    const blank = filled(4, () => false);
    expect(MaskPattern.getPenaltyN2(blank)).toBe(9 * 3);
  });

  it('leaves a perfect checkerboard unpenalised by rule 2', () => {
    const checker = filled(8, (row, col) => (row + col) % 2 === 0);
    expect(MaskPattern.getPenaltyN2(checker)).toBe(0);
  });

  /*
   * Rule 3 (N3 = 40): the 1:1:3:1:1 dark-light ratio of a finder pattern,
   * appearing anywhere in the data area, scores 40 — by far the heaviest
   * penalty, because a false finder is the one thing that can make a scanner
   * misread the symbol's geometry entirely rather than merely struggle.
   */
  it('penalises a finder-like run heavily', () => {
    const size = 11;
    const matrix = new BitMatrix(size);
    // 00001011101 — the pattern the rule looks for, light run then 1:1:3:1:1.
    const bits = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (let col = 0; col < size; col++) matrix.set(0, col, bits[col] === 1, false);

    expect(MaskPattern.getPenaltyN3(matrix)).toBeGreaterThanOrEqual(40);
  });

  it('finds a finder-like run vertically too', () => {
    const size = 11;
    const bits = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const matrix = new BitMatrix(size);
    for (let row = 0; row < size; row++) matrix.set(row, 0, bits[row] === 1, false);

    expect(MaskPattern.getPenaltyN3(matrix)).toBeGreaterThanOrEqual(40);
  });

  it('leaves a blank area unpenalised by rule 3', () => {
    expect(MaskPattern.getPenaltyN3(filled(11, () => false))).toBe(0);
  });

  /*
   * Rule 4 (N4 = 10): the further the proportion of dark modules strays from
   * half, the higher the score. An even split is what keeps a symbol readable
   * under uneven lighting.
   */
  it('leaves an even split unpenalised by rule 4', () => {
    expect(MaskPattern.getPenaltyN4(filled(10, (row, col) => (row + col) % 2 === 0))).toBe(0);
  });

  it('penalises an all-dark or all-light symbol at the maximum', () => {
    expect(MaskPattern.getPenaltyN4(filled(10, () => true))).toBe(100);
    expect(MaskPattern.getPenaltyN4(filled(10, () => false))).toBe(100);
  });

  it('penalises a lopsided split in proportion to how lopsided it is', () => {
    const slightly = filled(10, (row, col) => (row * 10 + col) % 10 < 6);
    const badly = filled(10, (row, col) => (row * 10 + col) % 10 < 9);
    expect(MaskPattern.getPenaltyN4(badly)).toBeGreaterThan(MaskPattern.getPenaltyN4(slightly));
  });
});

describe('getBestMask', () => {
  it('returns one of the eight patterns', () => {
    const matrix = filled(21, (row, col) => (row * col) % 3 === 0);
    const best = MaskPattern.getBestMask(matrix, () => undefined);

    expect(best).toBeGreaterThanOrEqual(0);
    expect(best).toBeLessThanOrEqual(7);
  });

  // Every candidate has to be scored with its own format information in place,
  // because the format bits are part of what rule 1 and rule 3 read.
  it('installs the format information for each candidate it scores', () => {
    const setupFormat = vi.fn();
    MaskPattern.getBestMask(filled(21, () => false), setupFormat);

    expect(setupFormat).toHaveBeenCalledTimes(8);
    expect(setupFormat.mock.calls.map((c) => c[0])).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  /*
   * It applies each mask to score it and then applies it again to undo it. If
   * the undo were ever skipped the matrix handed back would carry every mask
   * XOR-ed together — a symbol that is not merely wrong but unrecoverable.
   */
  it('leaves the matrix exactly as it found it', () => {
    const matrix = filled(21, (row, col) => (row + col * 3) % 5 === 0);
    const before = [...matrix.data];

    MaskPattern.getBestMask(matrix, () => undefined);

    expect(matrix.data).toEqual(before);
  });

  it('is deterministic for the same input', () => {
    const build = () => filled(21, (row, col) => (row * 7 + col * 3) % 4 === 0);
    expect(MaskPattern.getBestMask(build(), () => undefined)).toBe(
      MaskPattern.getBestMask(build(), () => undefined),
    );
  });
});

describe('isValid and from', () => {
  it.each([0, 1, 7])('accepts mask %i', (mask) => {
    expect(MaskPattern.isValid(mask)).toBe(true);
  });

  it.each([-1, 8, NaN, null, undefined])('rejects %s', (mask) => {
    expect(MaskPattern.isValid(mask as number)).toBeFalsy();
  });

  it('parses a valid mask', () => {
    expect(MaskPattern.from(3)).toBe(3);
    expect(MaskPattern.from('5')).toBe(5);
  });

  // `undefined` is not a failure here — it is how a caller says "choose the
  // best one for me", which is what `create` does when no mask is given.
  it('reports nothing for an invalid mask, meaning "choose for me"', () => {
    expect(MaskPattern.from(8)).toBeUndefined();
    expect(MaskPattern.from(undefined)).toBeUndefined();
    expect(MaskPattern.from('nonsense')).toBeUndefined();
  });

  it('accepts mask 0, which is falsy but valid', () => {
    expect(MaskPattern.from(0)).toBe(0);
  });
});
