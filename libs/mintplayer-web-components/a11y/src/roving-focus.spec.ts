import { describe, it, expect, afterEach, vi } from 'vitest';
import { RovingFocus } from './roving-focus';
import { deepActiveElement } from './focus-restore';

function list(count: number, disabled: number[] = []): HTMLElement[] {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return Array.from({ length: count }, (_, i) => {
    const item = document.createElement('button');
    item.id = `i${i}`;
    if (disabled.includes(i)) item.setAttribute('aria-disabled', 'true');
    container.appendChild(item);
    return item;
  });
}

function arrow(from: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
  from.dispatchEvent(event);
  return event;
}

describe('RovingFocus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('makes exactly one item tabbable', () => {
    const items = list(3);
    new RovingFocus({ items: () => items }).sync();

    expect(items.map((i) => i.tabIndex)).toEqual([0, -1, -1]);
  });

  it('never leaves the widget without a tab stop when the active item disappears', () => {
    // The mp-treeview bug: collapse the focused node's ancestor and no row is
    // tabbable, so the tree drops out of the tab order and cannot be entered.
    let items = list(3);
    const roving = new RovingFocus({ items: () => items });
    roving.sync();
    roving.moveTo(2);

    items = items.slice(0, 1);
    roving.sync();

    expect(items[0].tabIndex).toBe(0);
    expect(roving.index).toBe(0);
  });

  it('puts the tab stop on the first enabled item, not blindly on index 0', () => {
    // The bs-rating bug in general form: an unset or out-of-range active index
    // must not empty the tab order.
    const items = list(3, [0]);
    new RovingFocus({ items: () => items }).sync();

    expect(items.map((i) => i.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('moves focus and the tab stop together on ArrowDown', () => {
    const items = list(3);
    const roving = new RovingFocus({ items: () => items });
    roving.sync();

    expect(roving.onKeydown(arrow(items[0], 'ArrowDown'))).toBe(true);

    expect(deepActiveElement()).toBe(items[1]);
    expect(items.map((i) => i.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('clamps at the ends by default', () => {
    const items = list(2);
    const roving = new RovingFocus({ items: () => items });
    roving.sync();

    expect(roving.onKeydown(arrow(items[0], 'ArrowUp'))).toBe(false);
    expect(roving.index).toBe(0);
  });

  it('wraps when asked', () => {
    const items = list(2);
    const roving = new RovingFocus({ items: () => items, wrap: true });
    roving.sync();

    expect(roving.onKeydown(arrow(items[0], 'ArrowUp'))).toBe(true);
    expect(deepActiveElement()).toBe(items[1]);
  });

  it('skips disabled items', () => {
    const items = list(4, [1, 2]);
    const roving = new RovingFocus({ items: () => items });
    roving.sync();

    roving.onKeydown(arrow(items[0], 'ArrowDown'));

    expect(deepActiveElement()).toBe(items[3]);
  });

  it('does not move when every other item is disabled', () => {
    const items = list(3, [1, 2]);
    const roving = new RovingFocus({ items: () => items });
    roving.sync();

    expect(roving.onKeydown(arrow(items[0], 'ArrowDown'))).toBe(false);
    expect(roving.index).toBe(0);
  });

  it('ignores the off-axis arrows for its orientation', () => {
    const items = list(3);
    const vertical = new RovingFocus({ items: () => items, orientation: 'vertical' });
    vertical.sync();

    expect(vertical.onKeydown(arrow(items[0], 'ArrowRight'))).toBe(false);
    expect(vertical.onKeydown(arrow(items[0], 'ArrowDown'))).toBe(true);
  });

  it('handles both axes when orientation is "both"', () => {
    const items = list(3);
    const roving = new RovingFocus({ items: () => items, orientation: 'both' });
    roving.sync();

    expect(roving.onKeydown(arrow(items[0], 'ArrowRight'))).toBe(true);
    expect(roving.onKeydown(arrow(items[1], 'ArrowDown'))).toBe(true);
    expect(roving.index).toBe(2);
  });

  it('Home and End jump to the first and last enabled items', () => {
    const items = list(4, [0, 3]);
    const roving = new RovingFocus({ items: () => items });
    roving.sync();

    roving.onKeydown(arrow(items[1], 'End'));
    expect(deepActiveElement()).toBe(items[2]);

    roving.onKeydown(arrow(items[2], 'Home'));
    expect(deepActiveElement()).toBe(items[1]);
  });

  it('ignores keys that did not originate on an item', () => {
    // A key typed into an input nested inside an item must reach the input, not
    // be reinterpreted as navigation — the mp-treeview node-template bug.
    const items = list(2);
    const nested = document.createElement('input');
    items[0].appendChild(nested);
    const roving = new RovingFocus({ items: () => items });
    roving.sync();

    expect(roving.onKeydown(arrow(nested, 'ArrowDown'))).toBe(false);
    expect(roving.index).toBe(0);
  });

  it('reports the active item and notifies on change', () => {
    const items = list(3);
    const onActiveChange = vi.fn();
    const roving = new RovingFocus({ items: () => items, onActiveChange });
    roving.sync();

    roving.onKeydown(arrow(items[0], 'ArrowDown'));

    expect(roving.activeItem).toBe(items[1]);
    expect(onActiveChange).toHaveBeenCalledWith(items[1], 1);
  });

  it('setActiveItem points the tab stop without stealing focus', () => {
    const items = list(3);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const roving = new RovingFocus({ items: () => items });
    roving.sync();

    roving.setActiveItem(items[2]);

    expect(items.map((i) => i.tabIndex)).toEqual([-1, -1, 0]);
    expect(deepActiveElement()).toBe(outside);
  });

  it('is inert with no items', () => {
    const roving = new RovingFocus({ items: () => [] });
    expect(() => roving.sync()).not.toThrow();
    expect(roving.activeItem).toBeNull();
  });

  it('honours a custom disabled predicate', () => {
    const items = list(3);
    items[1].classList.add('is-off');
    const roving = new RovingFocus({
      items: () => items,
      isDisabled: (el) => el.classList.contains('is-off'),
    });
    roving.sync();

    roving.onKeydown(arrow(items[0], 'ArrowDown'));

    expect(deepActiveElement()).toBe(items[2]);
  });
});
