import { describe, expect, it } from 'vitest';

import * as ECLevel from './error-correction-level';

/**
 * The four error-correction levels and their two-bit encodings.
 *
 * The bit values are the trap. They are **not** in ascending order of
 * correction strength: ISO/IEC 18004 Table 12 assigns M=00, L=01, H=10, Q=11,
 * so the numerically smallest indicator is the *middle* level. Anyone
 * "tidying" these into 0,1,2,3 by strength would produce symbols whose format
 * information claims the wrong level — and a scanner would then apply the wrong
 * correction and fail on an otherwise perfect code.
 */

describe('the level indicators', () => {
  // Table 12, in the order the standard gives them rather than by strength.
  it.each([
    ['L', ECLevel.L, 1],
    ['M', ECLevel.M, 0],
    ['Q', ECLevel.Q, 3],
    ['H', ECLevel.H, 2],
  ])('%s is %i', (_name, level, bit) => {
    expect(level.bit).toBe(bit);
  });

  it('assigns each level a distinct two-bit value', () => {
    const bits = [ECLevel.L, ECLevel.M, ECLevel.Q, ECLevel.H].map((l) => l.bit);
    expect(new Set(bits).size).toBe(4);
    expect(bits.every((b) => b >= 0 && b < 4)).toBe(true);
  });

  // Stated explicitly because it looks like a bug until you check the standard.
  it('does not order the indicators by correction strength', () => {
    expect(ECLevel.M.bit).toBeLessThan(ECLevel.L.bit);
  });
});

describe('fromString', () => {
  it.each([
    ['l', ECLevel.L],
    ['low', ECLevel.L],
    ['m', ECLevel.M],
    ['medium', ECLevel.M],
    ['q', ECLevel.Q],
    ['quartile', ECLevel.Q],
    ['h', ECLevel.H],
    ['high', ECLevel.H],
  ])('parses %s', (name, expected) => {
    expect(ECLevel.fromString(name)).toBe(expected);
  });

  it('ignores case', () => {
    expect(ECLevel.fromString('L')).toBe(ECLevel.L);
    expect(ECLevel.fromString('High')).toBe(ECLevel.H);
    expect(ECLevel.fromString('QUARTILE')).toBe(ECLevel.Q);
  });

  it('refuses a name it does not know', () => {
    expect(() => ECLevel.fromString('extreme')).toThrow(/Unknown EC level/);
    expect(() => ECLevel.fromString('')).toThrow();
  });
});

describe('isValid', () => {
  it('accepts each of the four levels', () => {
    for (const level of [ECLevel.L, ECLevel.M, ECLevel.Q, ECLevel.H]) {
      expect(ECLevel.isValid(level)).toBeTruthy();
    }
  });

  // M is bit 0, so a truthiness check on `level.bit` would reject the default
  // level — which is why the guard tests for `undefined` explicitly.
  it('accepts M, whose indicator is zero', () => {
    expect(ECLevel.isValid(ECLevel.M)).toBeTruthy();
  });

  it('rejects an indicator that does not fit in two bits', () => {
    expect(ECLevel.isValid({ bit: 4 })).toBeFalsy();
  });

  it('rejects a value with no indicator at all', () => {
    expect(ECLevel.isValid({} as ECLevel.ErrorCorrectionLevel)).toBeFalsy();
    expect(ECLevel.isValid(null as unknown as ECLevel.ErrorCorrectionLevel)).toBeFalsy();
  });
});

describe('from — the forgiving parser the public API uses', () => {
  it('accepts a name', () => {
    expect(ECLevel.from('high', ECLevel.M)).toBe(ECLevel.H);
  });

  it('accepts a level object', () => {
    expect(ECLevel.from(ECLevel.Q, ECLevel.M)).toBe(ECLevel.Q);
  });

  // A mistyped level should still produce a scannable code at the default
  // strength rather than throwing out of a render call.
  it('falls back for an unknown name', () => {
    expect(ECLevel.from('extreme', ECLevel.M)).toBe(ECLevel.M);
  });

  it('falls back for an invalid level object', () => {
    expect(ECLevel.from({ bit: 99 }, ECLevel.M)).toBe(ECLevel.M);
  });

  it('falls back for nothing at all', () => {
    expect(ECLevel.from(undefined as unknown as string, ECLevel.Q)).toBe(ECLevel.Q);
  });

  it('can fall back to any level, not only M', () => {
    expect(ECLevel.from('nonsense', ECLevel.H)).toBe(ECLevel.H);
  });
});
