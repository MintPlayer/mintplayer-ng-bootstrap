import { describe, expect, it } from 'vitest';

import { create } from './qr-code';
import * as ECLevel from './error-correction-level';
import * as Mode from './mode';
import { getSymbolSize } from './utils';

/**
 * The encoder end to end.
 *
 * There is no decoder here to round-trip against, so these tests assert the
 * **structural invariants ISO/IEC 18004 requires of every symbol** — the things
 * a scanner looks for before it reads a single data bit. If any of them is
 * wrong the symbol is not a QR code at all, however much it looks like one:
 * three finder patterns in the right corners, timing patterns down row and
 * column 6, alignment patterns from version 2, the always-dark module, and a
 * version block only from version 7.
 *
 * Together with `reed-solomon.spec.ts` — which proves the error correction is
 * mathematically sound — this is as close to "it will scan" as a unit test gets.
 */

const qr = (text: string, options: Record<string, unknown> = {}) => create(text, options);

/** Read a module as 1/0. */
const at = (code: ReturnType<typeof create>, row: number, col: number) =>
  code.modules.get(row, col);

describe('create — the basics', () => {
  it('refuses an empty input rather than emitting a blank symbol', () => {
    expect(() => create('', {})).toThrow(/No input text/);
    expect(() => create(undefined as unknown as string, {})).toThrow(/No input text/);
  });

  it('produces a square matrix of the version size', () => {
    const code = qr('HELLO');
    expect(code.modules.size).toBe(getSymbolSize(code.version));
    expect(code.modules.data).toHaveLength(code.modules.size ** 2);
  });

  it('picks the smallest version that fits', () => {
    expect(qr('1').version).toBe(1);
    expect(qr('a'.repeat(500)).version).toBeGreaterThan(1);
  });

  it('defaults to medium correction', () => {
    expect(qr('HELLO').errorCorrectionLevel).toBe(ECLevel.M);
  });

  it('honours a requested correction level', () => {
    expect(qr('HELLO', { errorCorrectionLevel: 'H' }).errorCorrectionLevel).toBe(ECLevel.H);
  });

  it('needs a bigger symbol for stronger correction', () => {
    const low = qr('a'.repeat(100), { errorCorrectionLevel: 'L' }).version;
    const high = qr('a'.repeat(100), { errorCorrectionLevel: 'H' }).version;
    expect(high).toBeGreaterThan(low);
  });

  it('chooses a mask in range', () => {
    const code = qr('HELLO WORLD');
    expect(code.maskPattern).toBeGreaterThanOrEqual(0);
    expect(code.maskPattern).toBeLessThanOrEqual(7);
  });

  it('honours an explicitly requested mask', () => {
    expect(qr('HELLO', { maskPattern: 5 }).maskPattern).toBe(5);
  });

  it('is deterministic', () => {
    const first = qr('https://example.com', { errorCorrectionLevel: 'Q' });
    const second = qr('https://example.com', { errorCorrectionLevel: 'Q' });
    expect(second.modules.data).toEqual(first.modules.data);
    expect(second.maskPattern).toBe(first.maskPattern);
  });
});

describe('create — version selection', () => {
  it('accepts a version large enough for the data', () => {
    expect(qr('HELLO', { version: 10 }).version).toBe(10);
  });

  // Silently growing the symbol would ignore what the caller asked for; the
  // error names the version they need, which is the only useful thing to say.
  it('refuses a version too small for the data, and says which is needed', () => {
    expect(() => create('a'.repeat(100), { version: 1 })).toThrow(
      /Minimum version required to store current data is: \d+/,
    );
  });

  it('refuses data too large for any symbol', () => {
    expect(() => create('a'.repeat(4000), { errorCorrectionLevel: 'H' })).toThrow(/too big/);
  });

  it('ignores a version outside the valid range and chooses one itself', () => {
    expect(qr('HELLO', { version: 99 }).version).toBe(1);
  });
});

describe('create — the function patterns every scanner looks for', () => {
  const code = qr('HELLO WORLD', { errorCorrectionLevel: 'M' });
  const size = code.modules.size;

  /**
   * A finder is a 7x7 concentric square: dark ring, light ring, 3x3 dark core.
   */
  const isFinderAt = (top: number, left: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onOuterRing = r === 0 || r === 6 || c === 0 || c === 6;
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const expected = onOuterRing || inCore ? 1 : 0;
        if (at(code, top + r, left + c) !== expected) return false;
      }
    }
    return true;
  };

  it('places a finder pattern in three corners', () => {
    expect(isFinderAt(0, 0)).toBe(true);
    expect(isFinderAt(0, size - 7)).toBe(true);
    expect(isFinderAt(size - 7, 0)).toBe(true);
  });

  // The bottom-right corner is deliberately left free — the asymmetry is how a
  // scanner works out which way up the symbol is.
  it('leaves the fourth corner without one', () => {
    expect(isFinderAt(size - 7, size - 7)).toBe(false);
  });

  // Row 6 and column 6 alternate dark/light between the finders. They are the
  // ruler a scanner uses to work out the module pitch.
  it('runs an alternating timing pattern along row and column 6', () => {
    for (let i = 8; i < size - 8; i++) {
      expect(at(code, 6, i), `row 6 col ${i}`).toBe(i % 2 === 0 ? 1 : 0);
      expect(at(code, i, 6), `col 6 row ${i}`).toBe(i % 2 === 0 ? 1 : 0);
    }
  });

  /*
   * The "dark module" — always set, always at (4 x version + 9, 8). It carries
   * no information; it exists so the format-information area can never be
   * entirely light.
   */
  it('always sets the fixed dark module', () => {
    for (const version of [1, 5, 10, 20]) {
      const symbol = qr('a'.repeat(5), { version });
      expect(symbol.modules.get(4 * version + 9, 8), `v${version}`).toBe(1);
    }
  });

  it('reserves the format information areas', () => {
    for (let i = 0; i < 9; i++) {
      if (i !== 6) {
        expect(code.modules.isReserved(8, i), `8,${i}`).toBe(true);
        expect(code.modules.isReserved(i, 8), `${i},8`).toBe(true);
      }
    }
  });
});

describe('create — alignment and version blocks', () => {
  // Version 1 is small enough that the finders alone fix the grid.
  it('places no alignment pattern in a version 1 symbol', () => {
    const code = qr('1');
    expect(code.version).toBe(1);
    // The centre of where an alignment pattern would go is data here.
    expect(code.modules.isReserved(18, 18)).toBeFalsy();
  });

  // Version 2 has exactly one, centred at (18, 18): a 5x5 concentric square.
  it('places the version 2 alignment pattern at the documented position', () => {
    const code = qr('a'.repeat(20), { version: 2 });

    expect(code.modules.get(18, 18)).toBe(1);
    for (let d = -1; d <= 1; d++) {
      if (d !== 0) {
        expect(code.modules.get(18 + d, 18), `ring ${d}`).toBe(0);
        expect(code.modules.get(18, 18 + d), `ring ${d}`).toBe(0);
      }
    }
    expect(code.modules.get(16, 16)).toBe(1);
    expect(code.modules.get(20, 20)).toBe(1);
  });

  // Below version 7 a scanner infers the version from the module count, so
  // there is no version block and those modules carry data instead.
  it('reserves no version block below version 7', () => {
    const code = qr('a'.repeat(30), { version: 6 });
    const size = code.modules.size;
    expect(code.modules.isReserved(0, size - 11)).toBeFalsy();
  });

  it('reserves the two version blocks from version 7', () => {
    const code = qr('a'.repeat(30), { version: 7 });
    const size = code.modules.size;

    for (let i = 0; i < 18; i++) {
      const row = Math.floor(i / 3);
      const col = (i % 3) + size - 11;
      expect(code.modules.isReserved(row, col), `top-right ${row},${col}`).toBe(true);
      expect(code.modules.isReserved(col, row), `bottom-left ${col},${row}`).toBe(true);
    }
  });
});

describe('create — segmentation', () => {
  it('encodes digits in numeric mode', () => {
    const code = qr('0123456789');
    expect(code.segments).toHaveLength(1);
    expect(code.segments[0].mode).toBe(Mode.NUMERIC);
  });

  it('encodes the alphanumeric set in alphanumeric mode', () => {
    expect(qr('HELLO WORLD').segments[0].mode).toBe(Mode.ALPHANUMERIC);
  });

  it('falls back to byte mode for anything else', () => {
    expect(qr('Hello, world!').segments[0].mode).toBe(Mode.BYTE);
  });

  // Mixed content is split so each run uses its densest mode, which is the
  // whole reason the segmenter runs a shortest-path search rather than picking
  // one mode for the string.
  it('splits mixed content into segments', () => {
    const code = qr('ABCDEFGHIJ1234567890123456789012345678901234567890');
    expect(code.segments.length).toBeGreaterThan(1);
    expect(code.segments.map((s) => s.mode)).toContain(Mode.NUMERIC);
  });

  // ...but only when splitting actually pays. Each extra segment costs a mode
  // indicator and a character count, so a short digit run inside text is
  // cheaper left as bytes.
  it('does not split when a switch would cost more than it saves', () => {
    expect(qr('AB1CD').segments).toHaveLength(1);
  });

  it('encodes a URL', () => {
    const code = qr('https://example.com/a/b?c=d');
    expect(code.segments.length).toBeGreaterThanOrEqual(1);
    expect(code.modules.size).toBeGreaterThan(21);
  });
});

describe('create — the symbol as a whole', () => {
  it('produces a different symbol for different data', () => {
    expect(qr('AAA').modules.data).not.toEqual(qr('BBB').modules.data);
  });

  it('produces a different symbol under a different mask', () => {
    const a = qr('HELLO WORLD', { maskPattern: 0 });
    const b = qr('HELLO WORLD', { maskPattern: 1 });
    expect(a.modules.data).not.toEqual(b.modules.data);
  });

  // Roughly half dark is what penalty rule 4 optimises for, and a symbol far
  // from that is hard to read under uneven lighting. The bound is loose because
  // small symbols are dominated by their function patterns.
  it('lands somewhere near an even split of dark and light', () => {
    for (const text of ['HELLO WORLD', 'https://example.com', '1'.repeat(200)]) {
      const code = qr(text);
      const dark = code.modules.data.filter(Boolean).length;
      const ratio = dark / code.modules.data.length;
      expect(ratio, text).toBeGreaterThan(0.3);
      expect(ratio, text).toBeLessThan(0.7);
    }
  });

  it('fills every module with a real boolean', () => {
    const code = qr('HELLO WORLD');
    expect(code.modules.data.every((m) => typeof m === 'boolean')).toBe(true);
  });

  it('encodes the largest payload each version claims to hold', () => {
    for (const [version, length] of [
      [1, 17],
      [5, 106],
      [10, 271],
    ] as const) {
      const code = qr('a'.repeat(length), { version, errorCorrectionLevel: 'L' });
      expect(code.version, `v${version}`).toBe(version);
    }
  });

  it('encodes across a range of versions without complaint', () => {
    for (const length of [1, 10, 50, 200, 800, 2000]) {
      const code = qr('a'.repeat(length), { errorCorrectionLevel: 'L' });
      expect(code.modules.size, `${length} chars`).toBe(getSymbolSize(code.version));
    }
  });
});
