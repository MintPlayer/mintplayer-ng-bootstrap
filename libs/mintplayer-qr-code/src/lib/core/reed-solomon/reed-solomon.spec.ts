import { describe, expect, it } from 'vitest';

import * as GF from './galois-field';
import * as Polynomial from './polynomial';
import { ReedSolomonEncoder } from './reed-solomon-encoder';

/**
 * The error correction layer: arithmetic in GF(256) modulo the primitive
 * polynomial 0x11D, and the Reed–Solomon encoder built on it.
 *
 * This is the one part of the encoder that can be tested *without* trusting the
 * implementation at all, because Reed–Solomon has a defining property: the
 * codeword formed by appending the EC bytes to the data bytes is exactly
 * divisible by the generator polynomial. A wrong table, a wrong shift, an
 * off-by-one in the padding — any of them break that, and no fixture is needed
 * to notice. `remainder is zero` below is the strongest test in this library.
 */

describe('GF(256) arithmetic', () => {
  // α^0 = 1, and α^8 = 0x1D because x^8 reduces modulo x^8+x^4+x^3+x^2+1.
  it('generates the field from the QR primitive polynomial', () => {
    expect(GF.exp(0)).toBe(1);
    expect(GF.exp(1)).toBe(2);
    expect(GF.exp(2)).toBe(4);
    expect(GF.exp(7)).toBe(128);
    expect(GF.exp(8)).toBe(0x1d);
  });

  it('inverts itself: log(exp(n)) is n across the whole field', () => {
    for (let n = 0; n < 255; n++) {
      expect(GF.log(GF.exp(n)), `n=${n}`).toBe(n);
    }
  });

  // The multiplicative group has order 255, so the exponent wraps there. The
  // anti-log table is deliberately doubled to 512 entries so `mul` can add two
  // logs without a modulo — the wrap has to survive that optimisation.
  it('wraps the exponent at 255', () => {
    expect(GF.exp(255)).toBe(GF.exp(0));
    expect(GF.exp(300)).toBe(GF.exp(45));
    expect(GF.exp(511)).toBe(GF.exp(256));
  });

  it('visits every non-zero element exactly once', () => {
    const seen = new Set(Array.from({ length: 255 }, (_unused, n) => GF.exp(n)));
    expect(seen.size).toBe(255);
    expect(seen.has(0)).toBe(false);
  });

  it('has no logarithm for zero', () => {
    expect(() => GF.log(0)).toThrow(/log/);
    expect(() => GF.log(-1)).toThrow();
  });

  it('multiplies by one as an identity', () => {
    for (const x of [1, 2, 7, 128, 255]) {
      expect(GF.mul(x, 1), `${x}`).toBe(x);
      expect(GF.mul(1, x), `${x}`).toBe(x);
    }
  });

  // Zero has no logarithm, so `mul` short-circuits it rather than indexing the
  // table with a garbage value.
  it('absorbs zero', () => {
    expect(GF.mul(0, 123)).toBe(0);
    expect(GF.mul(123, 0)).toBe(0);
    expect(GF.mul(0, 0)).toBe(0);
  });

  it('is commutative', () => {
    for (const [x, y] of [
      [2, 3],
      [7, 11],
      [200, 37],
      [255, 254],
    ]) {
      expect(GF.mul(x, y), `${x}x${y}`).toBe(GF.mul(y, x));
    }
  });

  it('is associative', () => {
    for (const [x, y, z] of [
      [2, 3, 5],
      [17, 200, 39],
    ]) {
      expect(GF.mul(GF.mul(x, y), z)).toBe(GF.mul(x, GF.mul(y, z)));
    }
  });

  // Multiplying two field elements adds their logarithms — the identity the
  // doubled table exists to exploit.
  it('adds logarithms', () => {
    expect(GF.mul(GF.exp(5), GF.exp(9))).toBe(GF.exp(14));
    expect(GF.mul(GF.exp(200), GF.exp(100))).toBe(GF.exp(45));
  });

  it('never leaves the field', () => {
    for (let x = 1; x < 256; x += 37) {
      for (let y = 1; y < 256; y += 53) {
        const product = GF.mul(x, y);
        expect(product).toBeGreaterThanOrEqual(0);
        expect(product).toBeLessThan(256);
      }
    }
  });
});

describe('polynomial arithmetic', () => {
  it('multiplies two polynomials into one of the summed degree', () => {
    const product = Polynomial.mul(new Uint8Array([1, 1]), new Uint8Array([1, 2]));
    expect(product).toHaveLength(3);
  });

  // (x + α^0)(x + α^1) = x² + 3x + 2 — the documented generator for two EC
  // codewords, and short enough to verify by hand.
  it('produces the documented degree-2 generator', () => {
    expect([...Polynomial.generateECPolynomial(2)]).toEqual([1, 3, 2]);
  });

  it('produces the documented degree-3 generator', () => {
    expect([...Polynomial.generateECPolynomial(3)]).toEqual([1, 7, 14, 8]);
  });

  it('produces a generator of degree n with n+1 coefficients', () => {
    for (const degree of [2, 7, 10, 13, 17, 22, 26, 30, 68]) {
      const poly = Polynomial.generateECPolynomial(degree);
      expect(poly, `degree ${degree}`).toHaveLength(degree + 1);
      expect(poly[0], `degree ${degree}`).toBe(1);
    }
  });

  // A generator is a product of (x + α^i) terms, so no coefficient can be zero
  // — a zero would mean a root was lost and the code would correct fewer errors
  // than it claims to.
  it('never produces a zero coefficient', () => {
    for (const degree of [7, 15, 26, 30]) {
      expect([...Polynomial.generateECPolynomial(degree)].every((c) => c !== 0)).toBe(true);
    }
  });

  it('leaves nothing when a polynomial is divided by itself', () => {
    const poly = Polynomial.generateECPolynomial(7);
    expect([...Polynomial.mod(poly, poly)]).toEqual([]);
  });

  it('returns a dividend smaller than the divisor unchanged', () => {
    const remainder = Polynomial.mod(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3, 4]));
    expect([...remainder]).toEqual([1, 2]);
  });

  it('does not mutate its inputs', () => {
    const dividend = new Uint8Array([1, 2, 3, 4, 5]);
    const divisor = Polynomial.generateECPolynomial(2);
    const before = [...dividend];

    Polynomial.mod(dividend, divisor);

    expect([...dividend]).toEqual(before);
  });
});

describe('ReedSolomonEncoder', () => {
  const bytes = (...values: number[]) => new Uint8Array(values);

  it('produces exactly as many EC codewords as its degree', () => {
    for (const degree of [7, 10, 13, 17, 22, 26, 30]) {
      const encoder = new ReedSolomonEncoder(degree);
      expect(encoder.encode(bytes(1, 2, 3, 4, 5)), `degree ${degree}`).toHaveLength(degree);
    }
  });

  /*
   * The defining property, and the reason this file needs no fixture: the full
   * codeword — data followed by its EC bytes — is exactly divisible by the
   * generator polynomial. A scanner's decoder relies on precisely this. Any
   * error in the field tables, the generator, the division or the left-padding
   * leaves a non-zero remainder here.
   */
  it('produces a codeword divisible by the generator', () => {
    for (const degree of [7, 10, 13, 17, 22, 26, 30]) {
      const encoder = new ReedSolomonEncoder(degree);
      const data = bytes(0x20, 0x5b, 0x0b, 0x78, 0xd1, 0x72, 0xdc, 0x4d, 0x43, 0x40);

      const ec = encoder.encode(data);
      const codeword = new Uint8Array([...data, ...ec]);
      const remainder = Polynomial.mod(codeword, encoder.genPoly!);

      expect([...remainder].filter((c) => c !== 0), `degree ${degree}`).toEqual([]);
    }
  });

  it('holds that property for the pad bytes the encoder emits', () => {
    const encoder = new ReedSolomonEncoder(10);
    const data = bytes(0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11);

    const codeword = new Uint8Array([...data, ...encoder.encode(data)]);

    expect([...Polynomial.mod(codeword, encoder.genPoly!)].filter((c) => c !== 0)).toEqual([]);
  });

  it('is deterministic', () => {
    const data = bytes(1, 2, 3, 4, 5, 6, 7, 8);
    expect([...new ReedSolomonEncoder(10).encode(data)]).toEqual([
      ...new ReedSolomonEncoder(10).encode(data),
    ]);
  });

  // Different data must produce different EC bytes, or the correction carries
  // no information about the payload at all.
  it('produces different codewords for different data', () => {
    const encoder = new ReedSolomonEncoder(10);
    expect([...encoder.encode(bytes(1, 2, 3))]).not.toEqual([...encoder.encode(bytes(1, 2, 4))]);
  });

  // All-zero data divides evenly, so the remainder is shorter than the degree
  // and has to be padded on the LEFT. Padding the wrong end shifts every EC
  // byte by one and the symbol becomes uncorrectable.
  it('left-pads a short remainder to the full degree', () => {
    const encoder = new ReedSolomonEncoder(10);
    const ec = encoder.encode(bytes(0, 0, 0, 0));

    expect(ec).toHaveLength(10);
    expect([...ec]).toEqual(new Array(10).fill(0));
  });

  it('encodes an empty block without complaint', () => {
    expect(new ReedSolomonEncoder(7).encode(bytes())).toHaveLength(7);
  });

  it('can be re-initialized to another degree', () => {
    const encoder = new ReedSolomonEncoder(7);
    encoder.initialize(13);

    expect(encoder.degree).toBe(13);
    expect(encoder.encode(bytes(1, 2, 3))).toHaveLength(13);
  });

  // A zero degree leaves the generator unbuilt, which is a programming error
  // rather than a data one — so it reports rather than silently emitting
  // nothing.
  it('refuses to encode before it has a generator', () => {
    expect(() => new ReedSolomonEncoder(0).encode(bytes(1, 2, 3))).toThrow(/not initialized/);
  });
});
