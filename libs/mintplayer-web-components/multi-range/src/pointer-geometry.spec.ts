import { describe, expect, it } from 'vitest';

import { nearestThumbIndex, pointerFraction, type TrackRect } from './pointer-geometry';

// A 200 x 20 horizontal track at x 100..300, y 50..70.
const H: TrackRect = { left: 100, right: 300, bottom: 70, width: 200, height: 20 };
// A 20 x 200 vertical track at y 0..200.
const V: TrackRect = { left: 0, right: 20, bottom: 200, width: 20, height: 200 };

const ltr = { vertical: false, rtl: false };
const rtl = { vertical: false, rtl: true };
const vertical = { vertical: true, rtl: false };

describe('pointerFraction', () => {
  it('measures a horizontal LTR track from its left edge', () => {
    expect(pointerFraction(H, 100, 0, ltr)).toBe(0);
    expect(pointerFraction(H, 150, 0, ltr)).toBe(0.25);
    expect(pointerFraction(H, 300, 0, ltr)).toBe(1);
  });

  it('measures a horizontal RTL track from its right edge', () => {
    expect(pointerFraction(H, 300, 0, rtl)).toBe(0);
    expect(pointerFraction(H, 250, 0, rtl)).toBe(0.25);
  });

  it('measures a vertical track from its bottom, ignoring x and RTL', () => {
    expect(pointerFraction(V, 999, 150, vertical)).toBe(0.25);
    expect(pointerFraction(V, 999, 150, { vertical: true, rtl: true })).toBe(0.25);
  });

  it('clamps positions past either end', () => {
    expect(pointerFraction(H, 0, 0, ltr)).toBe(0);
    expect(pointerFraction(H, 1000, 0, ltr)).toBe(1);
    expect(pointerFraction(V, 0, -50, vertical)).toBe(1);
  });

  it('has no position on a track with zero length (the NaN / jump-to-max bug)', () => {
    const collapsed: TrackRect = { left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    expect(pointerFraction(collapsed, 0, 0, ltr)).toBeNull();
    expect(pointerFraction(collapsed, 50, 0, ltr)).toBeNull();
    expect(pointerFraction(collapsed, 0, 50, vertical)).toBeNull();
  });

  it('judges length on the track\'s own axis only', () => {
    const flat: TrackRect = { left: 0, right: 200, bottom: 0, width: 200, height: 0 };
    expect(pointerFraction(flat, 50, 0, ltr)).toBe(0.25);
    expect(pointerFraction(flat, 50, 0, vertical)).toBeNull();
  });
});

describe('nearestThumbIndex', () => {
  it('picks the closest thumb', () => {
    expect(nearestThumbIndex([10, 50, 90], 60)).toBe(1);
    expect(nearestThumbIndex([10, 50, 90], 85)).toBe(2);
    expect(nearestThumbIndex([10, 50, 90], 0)).toBe(0);
  });

  it('breaks a stack toward the target: above picks the highest thumb', () => {
    expect(nearestThumbIndex([20, 50, 50, 50], 70)).toBe(3);
  });

  it('breaks a stack toward the target: below or on it picks the lowest', () => {
    expect(nearestThumbIndex([50, 50, 90], 30)).toBe(0);
    expect(nearestThumbIndex([50, 50], 50)).toBe(0);
  });

  it('an equal-distance pair splits by side', () => {
    expect(nearestThumbIndex([40, 60], 50)).toBe(0);
  });
});
