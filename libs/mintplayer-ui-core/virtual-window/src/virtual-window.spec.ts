import { describe, expect, it } from 'vitest';
import { sameWindow, virtualWindow } from './virtual-window';

describe('virtualWindow', () => {
  it('renders the viewport plus a buffer on each side', () => {
    expect(virtualWindow({ scrollTop: 1000, viewport: 200, itemSize: 20, total: 1000, buffer: 5 })).toEqual({
      start: 45,
      end: 65,
      before: 900,
      after: 18700,
    });
  });

  it('clamps at the top and the bottom', () => {
    expect(virtualWindow({ scrollTop: 0, viewport: 100, itemSize: 20, total: 3 })).toEqual({ start: 0, end: 3, before: 0, after: 0 });
    const bottom = virtualWindow({ scrollTop: 99999, viewport: 100, itemSize: 20, total: 50 });
    expect(bottom.end).toBe(50);
    expect(bottom.after).toBe(0);
  });

  it('survives an empty list and a zero item size', () => {
    expect(virtualWindow({ scrollTop: 0, viewport: 100, itemSize: 0, total: 0 })).toEqual({ start: 0, end: 0, before: 0, after: 0 });
  });

  it('compares windows by value', () => {
    const w = virtualWindow({ scrollTop: 0, viewport: 100, itemSize: 20, total: 10 });
    expect(sameWindow(w, { ...w })).toBe(true);
    expect(sameWindow(w, { ...w, end: 1 })).toBe(false);
  });
});
