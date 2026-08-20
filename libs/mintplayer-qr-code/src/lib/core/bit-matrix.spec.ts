import { describe, expect, it } from 'vitest';

import { BitMatrix } from './bit-matrix';

/**
 * The module grid. Two arrays over one square: what each module IS, and whether
 * it is *reserved* — a function pattern that masking must not touch. Getting
 * the reservation wrong is the failure mode with no visible symptom until a
 * scanner refuses the symbol, because a masked finder pattern still looks like
 * a QR code to a human.
 */

describe('BitMatrix — construction', () => {
  it('is square and starts empty', () => {
    const matrix = new BitMatrix(21);
    expect(matrix.size).toBe(21);
    expect(matrix.data).toHaveLength(21 * 21);
    expect(matrix.data.every((bit) => bit === false)).toBe(true);
  });

  it('starts with nothing reserved', () => {
    const matrix = new BitMatrix(21);
    expect(matrix.reservedBit.every((bit) => bit === false)).toBe(true);
  });

  it.each([0, -1, undefined, null])('refuses a size of %s', (size) => {
    expect(() => new BitMatrix(size as unknown as number)).toThrow(/greater than 0/);
  });

  it('accepts the smallest possible matrix', () => {
    expect(new BitMatrix(1).data).toHaveLength(1);
  });
});

describe('BitMatrix — reading and writing', () => {
  it('reads back what it was given, as 1 or 0', () => {
    const matrix = new BitMatrix(5);
    matrix.set(2, 3, true, false);
    expect(matrix.get(2, 3)).toBe(1);
    expect(matrix.get(3, 2)).toBe(0);
  });

  // Row-major: the row is the outer index. Transposing this would mirror every
  // symbol along its diagonal — which still renders, and still scans as
  // something, just not as the data that went in.
  it('addresses row-major', () => {
    const matrix = new BitMatrix(4);
    matrix.set(1, 0, true, false);
    expect(matrix.data[4]).toBe(true);
    expect(matrix.data[1]).toBe(false);
  });

  it('overwrites a module that was already set', () => {
    const matrix = new BitMatrix(3);
    matrix.set(0, 0, true, false);
    matrix.set(0, 0, false, false);
    expect(matrix.get(0, 0)).toBe(0);
  });

  it('reaches every module in the square', () => {
    const matrix = new BitMatrix(3);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        matrix.set(row, col, true, false);
      }
    }
    expect(matrix.data.filter(Boolean)).toHaveLength(9);
  });
});

describe('BitMatrix — reservation', () => {
  it('marks a module as reserved', () => {
    const matrix = new BitMatrix(5);
    matrix.set(0, 0, true, true);
    expect(matrix.isReserved(0, 0)).toBe(true);
  });

  it('leaves an ordinary write unreserved', () => {
    const matrix = new BitMatrix(5);
    matrix.set(0, 0, true, false);
    expect(matrix.isReserved(0, 0)).toBeFalsy();
  });

  // One-way on purpose. `qr-code.ts` writes the format-info area twice — once
  // with dummy bits purely to reserve it, then again with the real bits after
  // the mask is chosen — and the second write passes `reserved` as true again,
  // but nothing anywhere is meant to UNRESERVE a function module.
  it('never clears a reservation on a later write', () => {
    const matrix = new BitMatrix(5);
    matrix.set(1, 1, true, true);
    matrix.set(1, 1, false, false);
    expect(matrix.isReserved(1, 1)).toBe(true);
  });
});

describe('BitMatrix — xor', () => {
  it('flips a module when the mask bit is set', () => {
    const matrix = new BitMatrix(3);
    matrix.set(0, 0, true, false);
    matrix.xor(0, 0, true);
    expect(matrix.get(0, 0)).toBe(0);
  });

  it('leaves a module alone when the mask bit is clear', () => {
    const matrix = new BitMatrix(3);
    matrix.set(0, 0, true, false);
    matrix.xor(0, 0, false);
    expect(matrix.get(0, 0)).toBe(1);
  });

  /*
   * Regression guard. The two backing arrays were built with
   * `Array(n).map(() => false)` — and `map` SKIPS holes, so that produced
   * another sparse array containing nothing. `get` survived it (a hole reads
   * falsy), but `xor` did not: `undefined !== false` is `true`, so XOR-ing an
   * untouched module with 0 switched it on. Latent in the encoder only because
   * every module is written before masking runs.
   */
  it('leaves an untouched module alone when XOR-ed with 0', () => {
    const matrix = new BitMatrix(3);
    matrix.xor(1, 1, false);
    expect(matrix.get(1, 1)).toBe(0);
  });

  it('is its own inverse', () => {
    const matrix = new BitMatrix(3);
    matrix.set(1, 1, true, false);

    matrix.xor(1, 1, true);
    matrix.xor(1, 1, true);

    expect(matrix.get(1, 1)).toBe(1);
  });

  // Which is exactly how `getBestMask` works: it applies a mask, scores the
  // result, then applies the same mask again to undo it.
  it('restores the whole grid when applied twice', () => {
    const matrix = new BitMatrix(5);
    for (let i = 0; i < 25; i++) matrix.data[i] = i % 3 === 0;
    const before = [...matrix.data];

    for (let pass = 0; pass < 2; pass++) {
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          matrix.xor(row, col, (row + col) % 2 === 0);
        }
      }
    }

    expect(matrix.data).toEqual(before);
  });
});
