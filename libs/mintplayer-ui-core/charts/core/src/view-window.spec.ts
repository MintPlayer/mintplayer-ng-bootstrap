import { describe, expect, it } from 'vitest';
import {
  FITTED_VIEW,
  clampViewOffset,
  panView,
  pointFraction,
  projectRect,
  zoomViewAt,
  type ViewWindow,
} from './view-window';

describe('clampViewOffset', () => {
  it('keeps the window inside the content at every zoom', () => {
    expect(clampViewOffset(-0.2, 2)).toBe(0);
    expect(clampViewOffset(0.9, 2)).toBe(0.5);
    expect(clampViewOffset(0.3, 2)).toBe(0.3);
    // A fitted window has exactly one legal offset.
    expect(clampViewOffset(0.4, 1)).toBe(0);
  });
});

describe('zoomViewAt', () => {
  it('keeps the content point under the anchor fixed', () => {
    const view = zoomViewAt(FITTED_VIEW, 4, 0.25, 0.75, 32);
    expect(view.zoom).toBe(4);
    // Content under anchor before: (0.25, 0.75). After: x + 0.25/4, y + 0.75/4.
    expect(view.x + 0.25 / 4).toBeCloseTo(0.25, 10);
    expect(view.y + 0.75 / 4).toBeCloseTo(0.75, 10);
  });

  it('a centre anchor zooms symmetrically', () => {
    expect(zoomViewAt(FITTED_VIEW, 2, 0.5, 0.5, 32)).toEqual({ zoom: 2, x: 0.25, y: 0.25 });
  });

  it('clamps the magnification to [1, maxZoom], and a non-number resolves to 1', () => {
    expect(zoomViewAt(FITTED_VIEW, 100, 0.5, 0.5, 32).zoom).toBe(32);
    expect(zoomViewAt({ zoom: 4, x: 0.3, y: 0.3 }, 0.1, 0.5, 0.5, 32)).toEqual(FITTED_VIEW);
    expect(zoomViewAt({ zoom: 4, x: 0.3, y: 0.3 }, Number.NaN, 0.5, 0.5, 32).zoom).toBe(1);
  });

  it('zooming at a corner cannot push the window outside the content', () => {
    const view = zoomViewAt({ zoom: 2, x: 0.5, y: 0.5 }, 1.5, 0, 0, 32);
    expect(view.x).toBeLessThanOrEqual(1 - 1 / 1.5);
    expect(view.y).toBeLessThanOrEqual(1 - 1 / 1.5);
    expect(view.x).toBeGreaterThanOrEqual(0);
  });
});

describe('panView', () => {
  it('a fitted view has nothing to pan and is returned as-is', () => {
    expect(panView(FITTED_VIEW, 0.3, -0.3)).toBe(FITTED_VIEW);
  });

  it('content follows the pointer: dragging right moves the window left, scaled by the zoom', () => {
    const view: ViewWindow = { zoom: 4, x: 0.4, y: 0.4 };
    const next = panView(view, 0.2, -0.4);
    expect(next.zoom).toBe(4);
    expect(next.x).toBeCloseTo(0.35, 10);
    expect(next.y).toBeCloseTo(0.5, 10);
  });

  it('stops at the content edges', () => {
    const next = panView({ zoom: 2, x: 0.1, y: 0.4 }, 1, -1);
    expect(next).toEqual({ zoom: 2, x: 0, y: 0.5 });
  });
});

describe('projectRect', () => {
  it('is the identity for a fitted view', () => {
    expect(projectRect(FITTED_VIEW, 0.1, 0.2, 0.3, 0.4)).toEqual({ x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.4 });
  });

  it('maps content through the window: offset, then magnify', () => {
    expect(projectRect({ zoom: 2, x: 0.25, y: 0.5 }, 0.25, 0.5, 0.75, 1)).toEqual({ x0: 0, y0: 0, x1: 1, y1: 1 });
  });
});

describe('pointFraction', () => {
  const box = { left: 100, top: 50, width: 200, height: 100 };

  it('maps a client point to fractions of the box', () => {
    expect(pointFraction(box, 150, 75)).toEqual({ x: 0.25, y: 0.25 });
  });

  it('clamps points outside the box to its edges', () => {
    expect(pointFraction(box, 0, 500)).toEqual({ x: 0, y: 1 });
  });

  it('a missing or zero-area box yields the centre instead of dividing by zero', () => {
    expect(pointFraction(undefined, 10, 10)).toEqual({ x: 0.5, y: 0.5 });
    expect(pointFraction({ left: 0, top: 0, width: 0, height: 100 }, 10, 10)).toEqual({ x: 0.5, y: 0.5 });
    expect(pointFraction({ left: 0, top: 0, width: 100, height: 0 }, 10, 10)).toEqual({ x: 0.5, y: 0.5 });
  });
});
