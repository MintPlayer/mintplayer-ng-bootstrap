import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactiveControllerHost } from 'lit';
import { moveItemInArray, transferArrayItem } from './move-item';
import { resolveDropIndex, SortableController } from './sortable-controller';

describe('moveItemInArray', () => {
  it('moves an item forward and returns a new array', () => {
    const input = ['a', 'b', 'c', 'd'];
    const out = moveItemInArray(input, 0, 2);
    expect(out).toEqual(['b', 'c', 'a', 'd']);
    expect(input).toEqual(['a', 'b', 'c', 'd']); // original untouched
  });

  it('moves an item backward', () => {
    expect(moveItemInArray(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('is a no-op when indices match', () => {
    expect(moveItemInArray(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('clamps out-of-range indices instead of throwing', () => {
    expect(moveItemInArray(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
    expect(moveItemInArray(['a', 'b', 'c'], -5, 0)).toEqual(['a', 'b', 'c']);
  });
});

describe('transferArrayItem', () => {
  it('moves an item between arrays', () => {
    const { source, target } = transferArrayItem(['a', 'b', 'c'], ['x', 'y'], 1, 1);
    expect(source).toEqual(['a', 'c']);
    expect(target).toEqual(['x', 'b', 'y']);
  });

  it('handles an empty source without throwing', () => {
    const { source, target } = transferArrayItem([], ['x'], 0, 0);
    expect(source).toEqual([]);
    expect(target).toEqual(['x']);
  });
});

const box = (left: number, top: number, w: number, h: number) => ({
  left,
  top,
  right: left + w,
  bottom: top + h,
});

describe('resolveDropIndex', () => {
  // single horizontal row of three 100x20 boxes at x = 0,100,200
  const row = [box(0, 0, 100, 20), box(100, 0, 100, 20), box(200, 0, 100, 20)];

  it('returns 0 when the pointer is left of the first centre (horizontal)', () => {
    expect(resolveDropIndex(row, 10, 10, 'horizontal')).toBe(0);
  });

  it('inserts before an item when left of its centre', () => {
    expect(resolveDropIndex(row, 120, 10, 'horizontal')).toBe(1);
  });

  it('returns boxes.length past the last centre', () => {
    expect(resolveDropIndex(row, 290, 10, 'horizontal')).toBe(3);
  });

  it('uses Y for the vertical axis', () => {
    const col = [box(0, 0, 100, 20), box(0, 20, 100, 20), box(0, 40, 100, 20)];
    expect(resolveDropIndex(col, 10, 25, 'vertical')).toBe(1);
  });

  it('models reading order across rows for both-axis', () => {
    // row 0: x 0,100 ; row 1: x 0
    const wrap = [box(0, 0, 100, 20), box(100, 0, 100, 20), box(0, 20, 100, 20)];
    // pointer on the second row, left of the wrapped item's centre
    expect(resolveDropIndex(wrap, 10, 30, 'both')).toBe(2);
    // pointer on first row before the first centre
    expect(resolveDropIndex(wrap, 10, 10, 'both')).toBe(0);
  });
});

function fakeHost(): ReactiveControllerHost & HTMLElement {
  const el = document.createElement('div');
  return Object.assign(el, {
    addController: () => undefined,
    removeController: () => undefined,
    requestUpdate: () => undefined,
    updateComplete: Promise.resolve(true),
  }) as unknown as ReactiveControllerHost & HTMLElement;
}

function buildList(ids: string[]): HTMLElement {
  const container = document.createElement('div');
  for (const id of ids) {
    const chip = document.createElement('span');
    chip.dataset['sortableId'] = id;
    chip.tabIndex = 0;
    chip.textContent = id;
    container.appendChild(chip);
  }
  document.body.appendChild(container);
  return container;
}

function keydown(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('SortableController keyboard reorder', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('grabs with M and moves with arrow keys, emitting CDK-style indices', () => {
    let items = ['a', 'b', 'c'];
    const onDrop = vi.fn((e: { previousIndex: number; currentIndex: number }) => {
      items = moveItemInArray(items, e.previousIndex, e.currentIndex);
    });
    const container = buildList(items);
    const ctrl = new SortableController<string>(fakeHost(), {
      items: () => items,
      itemId: (i) => i,
      onDrop,
    });
    ctrl.attach(container);

    const firstChip = container.querySelector<HTMLElement>('[data-sortable-id="a"]')!;
    keydown(firstChip, 'm');
    keydown(firstChip, 'ArrowRight');

    expect(onDrop).toHaveBeenCalledWith({ previousIndex: 0, currentIndex: 1 });
    expect(items).toEqual(['b', 'a', 'c']);
  });

  it('does not move before grabbing', () => {
    const onDrop = vi.fn();
    const items = ['a', 'b', 'c'];
    const container = buildList(items);
    const ctrl = new SortableController<string>(fakeHost(), {
      items: () => items,
      itemId: (i) => i,
      onDrop,
    });
    ctrl.attach(container);

    keydown(container.querySelector('[data-sortable-id="a"]')!, 'ArrowRight');
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('clamps at the ends', () => {
    const items = ['a', 'b', 'c'];
    const onDrop = vi.fn();
    const container = buildList(items);
    const ctrl = new SortableController<string>(fakeHost(), {
      items: () => items,
      itemId: (i) => i,
      onDrop,
    });
    ctrl.attach(container);

    const first = container.querySelector<HTMLElement>('[data-sortable-id="a"]')!;
    keydown(first, 'm');
    keydown(first, 'ArrowLeft'); // already at index 0 -> no move
    expect(onDrop).not.toHaveBeenCalled();
  });
});
