import { describe, expect, it } from 'vitest';
import { clampColumnWidth, columnWidthPercent, edgeScrollVector } from './geometry';

const RECT = { left: 100, top: 50, right: 500, bottom: 450 };
const ZONE = 40;
const MAX = 18;

describe('edgeScrollVector', () => {
  it('is zero in the middle of the scroller', () => {
    expect(edgeScrollVector({ x: 300, y: 250 }, RECT, ZONE, MAX)).toEqual({ x: 0, y: 0 });
  });

  it('is zero exactly on the inner boundary of the edge zone', () => {
    expect(edgeScrollVector({ x: 140, y: 90 }, RECT, ZONE, MAX)).toEqual({ x: 0, y: 0 });
    expect(edgeScrollVector({ x: 460, y: 410 }, RECT, ZONE, MAX)).toEqual({ x: 0, y: 0 });
  });

  it('ramps linearly with depth into the zone, pointing toward the near edge', () => {
    // Halfway into the left and top zones.
    expect(edgeScrollVector({ x: 120, y: 70 }, RECT, ZONE, MAX)).toEqual({ x: -9, y: -9 });
    // Halfway into the right and bottom zones.
    expect(edgeScrollVector({ x: 480, y: 430 }, RECT, ZONE, MAX)).toEqual({ x: 9, y: 9 });
  });

  it('reaches full speed at the edge and clamps beyond it', () => {
    expect(edgeScrollVector({ x: 100, y: 450 }, RECT, ZONE, MAX)).toEqual({ x: -18, y: 18 });
    expect(edgeScrollVector({ x: -500, y: 9000 }, RECT, ZONE, MAX)).toEqual({ x: -18, y: 18 });
  });

  it('treats the axes independently', () => {
    expect(edgeScrollVector({ x: 490, y: 250 }, RECT, ZONE, MAX)).toEqual({ x: 13.5, y: 0 });
  });
});

describe('clampColumnWidth', () => {
  it('keeps a width that fits', () => {
    expect(clampColumnWidth(240, 1000, 80, 50)).toBe(240);
  });

  it('never goes below the minimum column', () => {
    expect(clampColumnWidth(10, 1000, 80, 50)).toBe(80);
  });

  it('always leaves the minimum grid width', () => {
    expect(clampColumnWidth(Number.MAX_SAFE_INTEGER, 1000, 80, 50)).toBe(950);
  });

  it('lets the minimum column win when the scroller is too narrow for both', () => {
    expect(clampColumnWidth(500, 100, 80, 50)).toBe(80);
  });

  it('rounds to a whole pixel', () => {
    expect(clampColumnWidth(200.6, 1000, 80, 50)).toBe(201);
  });
});

describe('columnWidthPercent', () => {
  it('reports the column as a whole percentage of the scroller', () => {
    expect(columnWidthPercent(250, 1000)).toBe(25);
    expect(columnWidthPercent(333, 1000)).toBe(33);
  });

  it('does not divide by zero before layout', () => {
    expect(columnWidthPercent(2, 0)).toBe(200);
  });
});
