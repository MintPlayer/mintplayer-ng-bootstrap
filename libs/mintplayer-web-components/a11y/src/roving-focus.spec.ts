import { describe, it, expect, afterEach, vi } from 'vitest';
import { RovingFocus, nextEnabledIndex, firstEnabledIndex, lastEnabledIndex } from './roving-focus';
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

  it('does not intercept browser and OS chords', () => {
    // Alt+Arrow is history navigation, Ctrl+Home jumps to the top of the
    // document, Cmd+Arrow is word-jump on macOS. The Angular directive guards
    // these; the comparison with it is what surfaced their absence here.
    const items = list(3);
    const roving = new RovingFocus({ items: () => items });
    roving.sync();

    for (const modifier of ['altKey', 'ctrlKey', 'metaKey'] as const) {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        [modifier]: true,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      items[0].dispatchEvent(event);
      expect(roving.onKeydown(event)).toBe(false);
    }
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

describe('shared navigation arithmetic', () => {
  const none = () => false;

  it('clamps at the ends without wrap', () => {
    expect(nextEnabledIndex(3, 2, 1, false, none)).toBe(-1);
    expect(nextEnabledIndex(3, 0, -1, false, none)).toBe(-1);
  });

  it('wraps when asked', () => {
    expect(nextEnabledIndex(3, 2, 1, true, none)).toBe(0);
    expect(nextEnabledIndex(3, 0, -1, true, none)).toBe(2);
  });

  it('skips disabled indexes', () => {
    const disabled = (i: number) => i === 1 || i === 2;
    expect(nextEnabledIndex(4, 0, 1, false, disabled)).toBe(3);
  });

  it('resolves back to the current index when wrapping past only-disabled siblings', () => {
    // Not a nowhere-to-go: with wrap, the sole enabled item is the one we are
    // on, so the walk legitimately comes back around to it. Matches the shipped
    // Angular directive, which is the behaviour to preserve.
    expect(nextEnabledIndex(3, 0, 1, true, (i) => i !== 0)).toBe(0);
  });

  it('reports nowhere-to-go when every other index is disabled and wrap is off', () => {
    expect(nextEnabledIndex(3, 0, 1, false, (i) => i !== 0)).toBe(-1);
  });

  it('is inert on an empty set', () => {
    expect(nextEnabledIndex(0, 0, 1, true, none)).toBe(-1);
    expect(firstEnabledIndex(0, none)).toBe(-1);
    expect(lastEnabledIndex(0, none)).toBe(-1);
  });

  it('reports -1 rather than 0 when every index is disabled', () => {
    // The Angular directive's contract, which the WC controller then clamps to a
    // tab stop of its own choosing. Keeping -1 here means neither caller has to
    // guess whether 0 meant "first" or "none".
    expect(firstEnabledIndex(3, () => true)).toBe(-1);
    expect(lastEnabledIndex(3, () => true)).toBe(-1);
  });

  it('finds the first and last enabled indexes', () => {
    const disabled = (i: number) => i === 0 || i === 3;
    expect(firstEnabledIndex(4, disabled)).toBe(1);
    expect(lastEnabledIndex(4, disabled)).toBe(2);
  });
});
