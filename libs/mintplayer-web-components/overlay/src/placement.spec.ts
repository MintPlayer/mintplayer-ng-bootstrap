import { describe, expect, it } from 'vitest';

import type { OverlayPosition } from './overlay-controller';
import {
  choosePlacement,
  clampToViewport,
  fitsInViewport,
  isAnchorOffscreen,
  placeFor,
  type AnchorBox,
} from './placement';

const box = (left: number, top: number, width: number, height: number): AnchorBox => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

// A 100 x 20 anchor at (200, 100); a 60 x 40 panel.
const ANCHOR = box(200, 100, 100, 20);
const PANEL = { width: 60, height: 40 };
const VIEWPORT = { width: 1000, height: 800, margin: 8 };

const pos = (
  originX: OverlayPosition['originX'],
  originY: OverlayPosition['originY'],
  overlayX: OverlayPosition['overlayX'],
  overlayY: OverlayPosition['overlayY'],
  offsets: { offsetX?: number; offsetY?: number } = {}
): OverlayPosition => ({ originX, originY, overlayX, overlayY, ...offsets });

describe('placeFor — LTR', () => {
  it.each([
    ['start/bottom to start/top: below, left-aligned', pos('start', 'bottom', 'start', 'top'), 200, 120],
    ['end/bottom to end/top: below, right-aligned', pos('end', 'bottom', 'end', 'top'), 240, 120],
    ['start/top to start/bottom: above', pos('start', 'top', 'start', 'bottom'), 200, 60],
    ['center/center to center/center: centred on the anchor', pos('center', 'center', 'center', 'center'), 220, 90],
    ['end/center to start/center: to the right, vertically centred', pos('end', 'center', 'start', 'center'), 300, 90],
  ])('%s', (_name, candidate, left, top) => {
    expect(placeFor(candidate, ANCHOR, PANEL, false)).toEqual({ left, top });
  });

  it('adds the candidate offsets', () => {
    const candidate = pos('start', 'bottom', 'start', 'top', { offsetX: 5, offsetY: -3 });
    expect(placeFor(candidate, ANCHOR, PANEL, false)).toEqual({ left: 205, top: 117 });
  });
});

describe('placeFor — RTL mirrors start and end', () => {
  it('start/start aligns the panel\'s right edge with the anchor\'s right edge', () => {
    expect(placeFor(pos('start', 'bottom', 'start', 'top'), ANCHOR, PANEL, true)).toEqual({ left: 240, top: 120 });
  });

  it('end/end aligns the panel\'s left edge with the anchor\'s left edge', () => {
    expect(placeFor(pos('end', 'bottom', 'end', 'top'), ANCHOR, PANEL, true)).toEqual({ left: 200, top: 120 });
  });

  it('center is direction-neutral', () => {
    expect(placeFor(pos('center', 'bottom', 'center', 'top'), ANCHOR, PANEL, true)).toEqual({ left: 220, top: 120 });
  });
});

describe('fitsInViewport', () => {
  it('fits inside the margins, edges included', () => {
    expect(fitsInViewport({ left: 8, top: 8 }, PANEL, VIEWPORT)).toBe(true);
    expect(fitsInViewport({ left: 932, top: 752 }, PANEL, VIEWPORT)).toBe(true);
  });

  it.each([
    ['into the left margin', { left: 7, top: 100 }],
    ['into the top margin', { left: 100, top: 7 }],
    ['past the right margin', { left: 933, top: 100 }],
    ['past the bottom margin', { left: 100, top: 753 }],
  ])('does not fit %s', (_name, placed) => {
    expect(fitsInViewport(placed, PANEL, VIEWPORT)).toBe(false);
  });
});

describe('clampToViewport', () => {
  it('leaves a placement that fits alone', () => {
    expect(clampToViewport({ left: 100, top: 100 }, PANEL, VIEWPORT)).toEqual({ left: 100, top: 100 });
  });

  it('pulls an overflowing panel back to the far margins', () => {
    expect(clampToViewport({ left: 990, top: 790 }, PANEL, VIEWPORT)).toEqual({ left: 932, top: 752 });
  });

  it('pushes a panel off the near edges to the near margins', () => {
    expect(clampToViewport({ left: -50, top: -5 }, PANEL, VIEWPORT)).toEqual({ left: 8, top: 8 });
  });

  it('pins a panel larger than the viewport to the start margin', () => {
    expect(clampToViewport({ left: 0, top: 0 }, { width: 2000, height: 900 }, VIEWPORT)).toEqual({ left: 8, top: 8 });
  });
});

describe('isAnchorOffscreen', () => {
  it.each([
    ['fully left', box(-120, 100, 100, 20), true],
    ['fully above', box(100, -30, 100, 20), true],
    ['fully right', box(1001, 100, 100, 20), true],
    ['fully below', box(100, 801, 100, 20), true],
    ['partly visible', box(-50, 100, 100, 20), false],
    ['inside', ANCHOR, false],
  ])('%s -> %s', (_name, rect, expected) => {
    expect(isAnchorOffscreen(rect, VIEWPORT)).toBe(expected);
  });
});

describe('choosePlacement', () => {
  const below = pos('start', 'bottom', 'start', 'top');
  const above = pos('start', 'top', 'start', 'bottom');

  it('takes the first position that fits', () => {
    expect(choosePlacement([ANCHOR], [below, above], PANEL, VIEWPORT, false)).toEqual({
      anchorIndex: 0,
      placement: { left: 200, top: 120 },
    });
  });

  it('flips to the next position when the first overflows', () => {
    const nearBottom = box(200, 770, 100, 20);
    expect(choosePlacement([nearBottom], [below, above], PANEL, VIEWPORT, false)).toEqual({
      anchorIndex: 0,
      placement: { left: 200, top: 730 },
    });
  });

  it('moves to the next anchor when no position fits the first', () => {
    const cramped = box(200, 770, 100, 20);
    const roomy = box(200, 100, 100, 20);
    const flushTop = box(200, 10, 100, 20);
    expect(choosePlacement([cramped, roomy], [below], PANEL, VIEWPORT, false)?.anchorIndex).toBe(1);
    expect(choosePlacement([flushTop, cramped], [above], PANEL, VIEWPORT, false)?.anchorIndex).toBe(1);
  });

  it('falls back to the last pair, clamped, when nothing fits', () => {
    const tall = { width: 60, height: 900 };
    expect(choosePlacement([ANCHOR], [below, above], tall, VIEWPORT, false)).toEqual({
      anchorIndex: 0,
      placement: { left: 200, top: 8 },
    });
  });

  it('has nothing to choose without anchors or positions', () => {
    expect(choosePlacement([], [below], PANEL, VIEWPORT, false)).toBeNull();
    expect(choosePlacement([ANCHOR], [], PANEL, VIEWPORT, false)).toBeNull();
  });
});
