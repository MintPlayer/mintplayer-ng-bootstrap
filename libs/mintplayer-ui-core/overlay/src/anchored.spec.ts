import { describe, expect, it } from 'vitest';
import { anchorSide, besidePlacement } from './anchored';

const box = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });
const anchor = box(100, 100, 50, 20);
const panel = { width: 40, height: 10 };
const viewport = { width: 1000, height: 800, margin: 8 };

describe('besidePlacement', () => {
  it('centres the panel on the requested side, a gap away', () => {
    expect(besidePlacement(anchor, panel, viewport, 'top', 6, false)).toEqual({ side: 'top', left: 105, top: 84 });
    expect(besidePlacement(anchor, panel, viewport, 'bottom', 6, false)).toEqual({ side: 'bottom', left: 105, top: 126 });
    expect(besidePlacement(anchor, panel, viewport, 'start', 6, false)).toEqual({ side: 'start', left: 54, top: 105 });
    expect(besidePlacement(anchor, panel, viewport, 'end', 6, false)).toEqual({ side: 'end', left: 156, top: 105 });
  });

  it('reads start and end against the direction', () => {
    expect(besidePlacement(anchor, panel, viewport, 'start', 6, true)).toEqual({ side: 'start', left: 156, top: 105 });
    expect(besidePlacement(anchor, panel, viewport, 'end', 6, true)).toEqual({ side: 'end', left: 54, top: 105 });
  });

  it('flips to the opposite side when the requested one does not fit', () => {
    expect(besidePlacement(box(100, 4, 50, 20), panel, viewport, 'top', 6, false).side).toBe('bottom');
    expect(besidePlacement(box(10, 100, 50, 20), panel, viewport, 'start', 6, false).side).toBe('end');
  });

  it('keeps the requested side, clamped into the viewport, when neither fits', () => {
    const tall = { width: 40, height: 500 };
    const placed = besidePlacement(box(100, 380, 50, 20), tall, viewport, 'top', 6, false);
    expect(placed.side).toBe('top');
    expect(placed.top).toBeGreaterThanOrEqual(8);
  });

  it('aligns flush with the start or end edge (a dropdown), mirrored in RTL', () => {
    expect(besidePlacement(anchor, panel, viewport, 'bottom', 2, false, 'start')).toEqual({ side: 'bottom', left: 100, top: 122 });
    expect(besidePlacement(anchor, panel, viewport, 'bottom', 2, false, 'end')).toEqual({ side: 'bottom', left: 110, top: 122 });
    expect(besidePlacement(anchor, panel, viewport, 'bottom', 2, true, 'start')).toEqual({ side: 'bottom', left: 110, top: 122 });
  });

  it('falls back on an unknown side', () => {
    expect(anchorSide('left', 'top')).toBe('top');
    expect(anchorSide('end', 'top')).toBe('end');
  });
});
