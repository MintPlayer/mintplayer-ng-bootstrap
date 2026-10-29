import { describe, expect, it } from 'vitest';
import { DragGesture, moveItem, reorderTarget } from './drag';

describe('DragGesture', () => {
  it('a mouse press becomes a drag past the threshold', () => {
    const g = new DragGesture({ threshold: 4 });
    g.down({ x: 0, y: 0 }, 'mouse', 0);
    expect(g.move({ x: 2, y: 2 }, 10)).toBe('pressed');
    expect(g.move({ x: 4, y: 0 }, 20)).toBe('dragging');
    expect(g.delta({ x: 10, y: 5 })).toEqual({ x: 10, y: 5 });
    expect(g.up()).toBe(true);
    expect(g.phase).toBe('idle');
  });

  it('a touch that moves before the hold is a scroll; one that rests is a drag', () => {
    const scroll = new DragGesture({ holdMs: 600 });
    scroll.down({ x: 0, y: 0 }, 'touch', 0);
    expect(scroll.move({ x: 0, y: 30 }, 100)).toBe('scrolling');
    expect(scroll.up()).toBe(false);

    const drag = new DragGesture({ holdMs: 600 });
    drag.down({ x: 0, y: 0 }, 'touch', 0);
    expect(drag.hold(599)).toBe('pressed');
    expect(drag.hold(600)).toBe('dragging');
  });

  it('holdMs 0 makes touch behave like a mouse', () => {
    const g = new DragGesture({ holdMs: 0 });
    g.down({ x: 0, y: 0 }, 'touch', 0);
    expect(g.move({ x: 10, y: 0 }, 1)).toBe('dragging');
  });
});

describe('moveItem', () => {
  it('moves forwards and backwards without mutating', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(moveItem(items, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(items, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(items, 1, 99)).toEqual(['a', 'c', 'd', 'b']);
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('reorderTarget', () => {
  const alt = { altKey: true };
  it('moves one place with Alt+Arrow and to the ends with Alt+Home/End', () => {
    expect(reorderTarget('ArrowDown', alt, 1, 4)).toBe(2);
    expect(reorderTarget('ArrowUp', alt, 1, 4)).toBe(0);
    expect(reorderTarget('End', alt, 1, 4)).toBe(3);
    expect(reorderTarget('Home', alt, 1, 4)).toBe(0);
    expect(reorderTarget('ArrowLeft', alt, 1, 4, 'horizontal', true)).toBe(2);
  });

  it('refuses without Alt, at the edges and for foreign keys', () => {
    expect(reorderTarget('ArrowDown', { altKey: false }, 1, 4)).toBeNull();
    expect(reorderTarget('ArrowUp', alt, 0, 4)).toBeNull();
    expect(reorderTarget('x', alt, 1, 4)).toBeNull();
  });
});
