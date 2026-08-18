import { describe, expect, it } from 'vitest';

import { BLACK, WHITE, getImageWidth, getOptions, getScale, qrToImageData } from './utils';
import { create } from '../core/qr-code';

/**
 * Render options and the rasteriser.
 *
 * Everything here exists to turn a module grid into pixels, and the two rules
 * that carry real weight are about **readability rather than appearance**: the
 * quiet zone (the light margin a scanner needs to find the symbol's edge at
 * all — four modules, clause 9.1) and the scale, which decides whether a module
 * lands on a whole number of pixels or is smeared across a boundary.
 */

describe('getOptions — defaults', () => {
  it('applies the four-module quiet zone the standard requires', () => {
    expect(getOptions().margin).toBe(4);
  });

  it('defaults to four pixels per module', () => {
    expect(getOptions().scale).toBe(4);
  });

  it('defaults to black on white', () => {
    const options = getOptions();
    expect(options.color?.dark).toMatchObject({ r: 0, g: 0, b: 0, a: 255 });
    expect(options.color?.light).toMatchObject({ r: 255, g: 255, b: 255, a: 255 });
  });

  it('survives being given nothing at all', () => {
    expect(() => getOptions(undefined)).not.toThrow();
    expect(() => getOptions({})).not.toThrow();
  });
});

describe('getOptions — the margin', () => {
  it('accepts a wider margin', () => {
    expect(getOptions({ margin: 10 }).margin).toBe(10);
  });

  // Zero is legitimate — a caller compositing the symbol into a layout that
  // already provides the quiet zone.
  it('accepts a margin of zero', () => {
    expect(getOptions({ margin: 0 }).margin).toBe(0);
  });

  // A negative margin would crop into the symbol itself, so it falls back to
  // the standard's four rather than producing an unscannable image.
  it('falls back to four for a negative margin', () => {
    expect(getOptions({ margin: -5 }).margin).toBe(4);
  });

  it('falls back to four when the margin is absent', () => {
    expect(getOptions({ margin: undefined }).margin).toBe(4);
  });
});

describe('getOptions — width and scale', () => {
  it('accepts a width at or above the smallest symbol', () => {
    expect(getOptions({ width: 200 }).width).toBe(200);
  });

  // Below 21 the requested width cannot hold even a version 1 symbol at one
  // pixel per module, so it is ignored in favour of scaling.
  it('ignores a width smaller than a version 1 symbol', () => {
    expect(getOptions({ width: 10 }).width).toBeUndefined();
  });

  it('accepts an explicit scale', () => {
    expect(getOptions({ scale: 8 }).scale).toBe(8);
  });

  it('lets a width override the scale', () => {
    expect(getOptions({ width: 300, scale: 12 }).scale).toBe(4);
  });
});

describe('getOptions — colours', () => {
  it('expands a three-digit hex', () => {
    expect(getOptions({ color: { dark: '#f00' } }).color?.dark).toMatchObject({
      r: 255,
      g: 0,
      b: 0,
      a: 255,
    });
  });

  it('reads a six-digit hex and assumes full opacity', () => {
    expect(getOptions({ color: { dark: '#3788d8' } }).color?.dark).toMatchObject({
      r: 0x37,
      g: 0x88,
      b: 0xd8,
      a: 255,
    });
  });

  it('reads an eight-digit hex with its alpha', () => {
    expect(getOptions({ color: { light: '#00000080' } }).color?.light).toMatchObject({
      r: 0,
      g: 0,
      b: 0,
      a: 0x80,
    });
  });

  it('accepts a hex with no leading hash', () => {
    expect(getOptions({ color: { dark: 'ff0000' } }).color?.dark).toMatchObject({ r: 255, g: 0 });
  });

  // An unparseable colour yields null rather than a guess, so a caller can tell
  // "not set" from "set to black" — the same rule the scheduler's colour
  // helpers follow.
  it.each(['rgb(0,0,0)', '#12345', '#123456789'])('refuses to guess at %s', (colour) => {
    expect(getOptions({ color: { dark: colour } }).color?.dark).toBeNull();
  });

  // An EMPTY colour is not an unparseable one — it means the consumer left the
  // field blank, so the documented default applies rather than null.
  it('falls back to the default for an empty colour', () => {
    expect(getOptions({ color: { dark: '' } }).color?.dark).toMatchObject({ r: 0, g: 0, b: 0, a: 255 });
  });

  /*
   * Regression guard. `red` is three characters, so it sailed past the LENGTH
   * checks, expanded to `rreeddFF`, and `parseInt(..., 16)` returned NaN — at
   * which point every shift produced 0 and the caller was handed a fully
   * TRANSPARENT BLACK. A consumer who wrote `color: { dark: 'red' }` got an
   * invisible QR code with nothing logged anywhere. The characters are now
   * validated as well as the length.
   */
  it.each(['red', 'cyan', 'tan', 'gold'])('refuses the CSS colour name %s', (name) => {
    expect(getOptions({ color: { dark: name } }).color?.dark).toBeNull();
  });
});

describe('getScale', () => {
  it('uses the plain scale when no width is asked for', () => {
    expect(getScale(21, { scale: 4, margin: 4 })).toBe(4);
  });

  // A requested width has to cover the symbol AND both margins, or the image
  // would crop the quiet zone away.
  it('derives a scale from a width that fits the symbol and its margins', () => {
    expect(getScale(21, { width: 290, margin: 4 })).toBe(10);
  });

  it('ignores a width too small for the symbol plus its margins', () => {
    expect(getScale(21, { width: 25, margin: 4, scale: 4 })).toBe(4);
  });

  it('accounts for the margin on both sides', () => {
    expect(getScale(21, { width: 21, margin: 0, scale: 4 })).toBe(1);
  });
});

describe('getImageWidth', () => {
  it('covers the symbol and both margins', () => {
    expect(getImageWidth(21, { scale: 4, margin: 4 })).toBe((21 + 8) * 4);
  });

  it('matches a requested width exactly', () => {
    expect(getImageWidth(21, { width: 290, margin: 4 })).toBe(290);
  });

  it('drops the margin when there is none', () => {
    expect(getImageWidth(21, { scale: 2, margin: 0 })).toBe(42);
  });
});

describe('qrToImageData', () => {
  const render = (text: string, options: Record<string, unknown>) => {
    const code = create(text, {});
    const opts = { margin: 4, scale: 1, color: { dark: BLACK, light: WHITE }, ...options };
    const size = getImageWidth(code.modules.size, opts);
    const pixels = new Uint8ClampedArray(size * size * 4);
    qrToImageData(pixels, code, opts);
    return { code, opts, size, pixels };
  };

  const pixelAt = (pixels: Uint8ClampedArray, size: number, x: number, y: number) =>
    [...pixels.slice((y * size + x) * 4, (y * size + x) * 4 + 4)];

  it('fills every pixel of the image', () => {
    const { size, pixels } = render('HELLO', {});
    expect(pixels).toHaveLength(size * size * 4);
    expect(pixels.every((channel, i) => (i % 4 === 3 ? channel === 255 : true))).toBe(true);
  });

  /*
   * The quiet zone. A scanner locates a symbol by finding its finder patterns
   * against a light surround; without the margin there is nothing to find the
   * edge against, and the symbol simply is not recognised.
   */
  it('paints the whole quiet zone in the light colour', () => {
    const { size, pixels } = render('HELLO', { margin: 4, scale: 1 });

    for (let i = 0; i < 4; i++) {
      expect(pixelAt(pixels, size, i, 0), `top ${i}`).toEqual([255, 255, 255, 255]);
      expect(pixelAt(pixels, size, 0, i), `left ${i}`).toEqual([255, 255, 255, 255]);
      expect(pixelAt(pixels, size, size - 1 - i, size - 1), `bottom-right ${i}`).toEqual([
        255, 255, 255, 255,
      ]);
    }
  });

  // The top-left finder starts immediately inside the margin and its outermost
  // module is dark, which makes it the easiest anchor to check the origin
  // against.
  it('places the symbol immediately inside the margin', () => {
    const { size, pixels } = render('HELLO', { margin: 4, scale: 1 });
    expect(pixelAt(pixels, size, 4, 4)).toEqual([0, 0, 0, 255]);
  });

  it('scales each module to a square block of pixels', () => {
    const { size, pixels } = render('HELLO', { margin: 0, scale: 3 });

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(pixelAt(pixels, size, x, y), `${x},${y}`).toEqual([0, 0, 0, 255]);
      }
    }
  });

  it('honours custom colours', () => {
    const { size, pixels } = render('HELLO', {
      margin: 1,
      scale: 1,
      color: { dark: { r: 1, g: 2, b: 3, a: 255 }, light: { r: 4, g: 5, b: 6, a: 255 } },
    });

    expect(pixelAt(pixels, size, 0, 0)).toEqual([4, 5, 6, 255]);
    expect(pixelAt(pixels, size, 1, 1)).toEqual([1, 2, 3, 255]);
  });

  it('renders with no margin at all when asked', () => {
    const { code, size, pixels } = render('HELLO', { margin: 0, scale: 1 });
    expect(size).toBe(code.modules.size);
    expect(pixelAt(pixels, size, 0, 0)).toEqual([0, 0, 0, 255]);
  });

  it('produces the same image twice for the same input', () => {
    const first = render('HELLO WORLD', { margin: 2, scale: 2 });
    const second = render('HELLO WORLD', { margin: 2, scale: 2 });
    expect([...second.pixels]).toEqual([...first.pixels]);
  });
});
