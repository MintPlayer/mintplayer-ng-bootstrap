import { describe, expect, it } from 'vitest';

import { clampBoundsToHost, floatingZIndex, isPointWithinBounds } from './geometry';

/**
 * Floating-window arithmetic. This is the part of the dock jsdom can never
 * reach through the DOM — every rect there measures zero — and simultaneously
 * the part where being one pixel wrong puts a window's title bar off-screen
 * where the user cannot grab it back.
 */

describe('clampBoundsToHost', () => {
  const HOST = { width: 1000, height: 800 };

  it('leaves a window that already fits alone', () => {
    expect(clampBoundsToHost({ left: 100, top: 50, width: 200, height: 150 }, HOST)).toEqual({
      left: 100,
      top: 50,
      width: 200,
      height: 150,
    });
  });

  it('pins a window flush to the right edge rather than past it', () => {
    expect(clampBoundsToHost({ left: 900, top: 0, width: 200, height: 100 }, HOST).left).toBe(800);
  });

  it('pins a window flush to the bottom edge', () => {
    expect(clampBoundsToHost({ left: 0, top: 750, width: 100, height: 100 }, HOST).top).toBe(700);
  });

  it('allows a window to sit exactly against the far corner', () => {
    expect(clampBoundsToHost({ left: 800, top: 700, width: 200, height: 100 }, HOST)).toEqual({
      left: 800,
      top: 700,
      width: 200,
      height: 100,
    });
  });

  it('lifts a negative offset back to the origin', () => {
    expect(clampBoundsToHost({ left: -50, top: -20, width: 100, height: 100 }, HOST)).toMatchObject({
      left: 0,
      top: 0,
    });
  });

  // Shrink first, then position: a window wider than its host has no valid
  // left at its requested width, so clamping position alone would loop.
  it('shrinks an over-wide window to the host and pins it to the origin', () => {
    expect(clampBoundsToHost({ left: 300, top: 0, width: 2000, height: 100 }, HOST)).toMatchObject({
      left: 0,
      width: 1000,
    });
  });

  it('shrinks an over-tall window the same way', () => {
    expect(clampBoundsToHost({ left: 0, top: 300, width: 100, height: 2000 }, HOST)).toMatchObject({
      top: 0,
      height: 800,
    });
  });

  it('handles a window larger than the host in both axes', () => {
    expect(clampBoundsToHost({ left: -100, top: -100, width: 5000, height: 5000 }, HOST)).toEqual({
      left: 0,
      top: 0,
      width: 1000,
      height: 800,
    });
  });

  /*
   * An unmeasured host returns the intent untouched, and that is the point of
   * the guard rather than an oversight. A dock renders its first frame before
   * the ResizeObserver has reported anything, and clamping against a zero host
   * would collapse every floating window to a point — visibly, once — before
   * the next frame restored it.
   */
  it('returns the intent unchanged while the host is unmeasured', () => {
    const intent = { left: 400, top: 400, width: 300, height: 300 };
    expect(clampBoundsToHost(intent, { width: 0, height: 0 })).toBe(intent);
    expect(clampBoundsToHost(intent, { width: 1000, height: 0 })).toBe(intent);
    expect(clampBoundsToHost(intent, { width: 0, height: 1000 })).toBe(intent);
  });

  it('treats a negative host as unmeasured too', () => {
    const intent = { left: 0, top: 0, width: 10, height: 10 };
    expect(clampBoundsToHost(intent, { width: -1, height: 100 })).toBe(intent);
  });

  it('never returns the input object when it does clamp', () => {
    const intent = { left: 100, top: 50, width: 200, height: 150 };
    expect(clampBoundsToHost(intent, HOST)).not.toBe(intent);
  });
});

describe('isPointWithinBounds', () => {
  const BOUNDS = { left: 10, right: 20, top: 30, bottom: 40 };

  it('accepts a point in the middle', () => {
    expect(isPointWithinBounds(BOUNDS, 15, 35)).toBe(true);
  });

  // Inclusive edges: a pointer at the exact boundary of a header is over it,
  // and an exclusive test makes a one-pixel drop target unhittable.
  it.each([
    [10, 30],
    [20, 30],
    [10, 40],
    [20, 40],
  ])('accepts the corner (%i, %i)', (x, y) => {
    expect(isPointWithinBounds(BOUNDS, x, y)).toBe(true);
  });

  it.each([
    ['left of', 9, 35],
    ['right of', 21, 35],
    ['above', 15, 29],
    ['below', 15, 41],
  ])('rejects a point %s the box', (_where, x, y) => {
    expect(isPointWithinBounds(BOUNDS, x, y)).toBe(false);
  });

  it('rejects a NaN coordinate rather than accepting it', () => {
    expect(isPointWithinBounds(BOUNDS, Number.NaN, 35)).toBe(false);
    expect(isPointWithinBounds(BOUNDS, 15, Number.NaN)).toBe(false);
  });

  it('rejects everything for an inverted box', () => {
    expect(isPointWithinBounds({ left: 20, right: 10, top: 40, bottom: 30 }, 15, 35)).toBe(false);
  });
});

describe('floatingZIndex', () => {
  const bounds = { left: 0, top: 0, width: 100, height: 100 };

  it('stacks later windows above earlier ones by default', () => {
    const layouts = [
      { bounds, root: null },
      { bounds, root: null },
    ];
    expect(floatingZIndex(layouts[0], 0)).toBe(10);
    expect(floatingZIndex(layouts[1], 1)).toBe(11);
  });

  it('lets a consumer pin a window with an explicit z-index', () => {
    expect(floatingZIndex({ bounds, root: null, zIndex: 999 }, 0)).toBe(999);
  });

  it('accepts a z-index of zero, which is a real value', () => {
    expect(floatingZIndex({ bounds, root: null, zIndex: 0 }, 3)).toBe(0);
  });

  // A `z-index: NaN` is dropped by the browser without a word, leaving the
  // window wherever the previous rule put it.
  it('falls back when the override is not a finite number', () => {
    expect(floatingZIndex({ bounds, root: null, zIndex: Number.NaN }, 2)).toBe(12);
    expect(
      floatingZIndex({ bounds, root: null, zIndex: 'top' as unknown as number }, 2),
    ).toBe(12);
  });

  it('falls back to the index when the window is gone', () => {
    expect(floatingZIndex(undefined, 4)).toBe(14);
  });
});

/*
 * Moved verbatim from the element spec, where these reached in through
 * `dock.clampBoundsToHost`. The "Panel 5 repro" is the bug that produced them.
 */
describe('clampBoundsToHost — the cases that produced it', () => {
  type Bounds = { left: number; top: number; width: number; height: number };
  const clamp = clampBoundsToHost;

  it('returns intent unchanged when fully inside the host', () => {
    const out = clamp({ left: 100, top: 50, width: 200, height: 150 }, { width: 1000, height: 800 });
    expect(out).toEqual({ left: 100, top: 50, width: 200, height: 150 });
  });

  it('shifts pane inward when right-overflow (Panel 5 repro)', () => {
    const out = clamp({ left: 680, top: 96, width: 320, height: 220 }, { width: 900, height: 600 });
    expect(out).toEqual({ left: 580, top: 96, width: 320, height: 220 });
  });

  it('shifts pane inward when bottom-overflow', () => {
    const out = clamp({ left: 100, top: 500, width: 200, height: 200 }, { width: 1000, height: 600 });
    expect(out).toEqual({ left: 100, top: 400, width: 200, height: 200 });
  });

  it('clamps a negative left to 0', () => {
    const out = clamp({ left: -50, top: 100, width: 200, height: 150 }, { width: 1000, height: 600 });
    expect(out).toEqual({ left: 0, top: 100, width: 200, height: 150 });
  });

  it('clamps a negative top to 0', () => {
    const out = clamp({ left: 100, top: -50, width: 200, height: 150 }, { width: 1000, height: 600 });
    expect(out).toEqual({ left: 100, top: 0, width: 200, height: 150 });
  });

  it('shrinks width and pins left to 0 when pane is wider than host', () => {
    const out = clamp({ left: 100, top: 50, width: 1200, height: 200 }, { width: 900, height: 600 });
    expect(out).toEqual({ left: 0, top: 50, width: 900, height: 200 });
  });

  it('shrinks height and pins top to 0 when pane is taller than host', () => {
    const out = clamp({ left: 100, top: 50, width: 200, height: 800 }, { width: 1000, height: 600 });
    expect(out).toEqual({ left: 100, top: 0, width: 200, height: 600 });
  });

  it('drops the 192/128 minimum when host is smaller — pane shrinks to fit', () => {
    const out = clamp({ left: 50, top: 50, width: 192, height: 128 }, { width: 100, height: 80 });
    expect(out).toEqual({ left: 0, top: 0, width: 100, height: 80 });
  });

  it('returns intent unchanged when host has zero width/height (not yet measured)', () => {
    const intent = { left: 680, top: 96, width: 320, height: 220 };
    expect(clamp(intent, { width: 0, height: 0 })).toEqual(intent);
    expect(clamp(intent, { width: 0, height: 600 })).toEqual(intent);
    expect(clamp(intent, { width: 1000, height: 0 })).toEqual(intent);
  });

  it('is idempotent — clamping a clamped value is a no-op', () => {
    const cases: Bounds[] = [
      { left: 680, top: 96, width: 320, height: 220 },
      { left: -50, top: -50, width: 1200, height: 800 },
      { left: 50, top: 50, width: 192, height: 128 },
    ];
    const host = { width: 900, height: 600 };
    cases.forEach((intent) => {
      const first = clamp(intent, host);
      const second = clamp(first, host);
      expect(second).toEqual(first);
    });
  });
});
