import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addClasses,
  findClosestWithData,
  getCSSVariable,
  getDataAttributes,
  getElementByData,
  getRelativePosition,
  getScrollPosition,
  isInViewport,
  removeClasses,
  scrollToTime,
  setCSSVariable,
  toggleClass,
} from './dom';

/**
 * The scheduler's DOM helpers. Small enough to look obviously correct, which is
 * exactly why they were at zero coverage — and two of them are not obvious at
 * all: `getRelativePosition` reads a different property for touch than for
 * mouse, and `getDataAttributes` round-trips through `dataset`, where the
 * browser rewrites every hyphenated attribute name into camelCase.
 */

const attach = <T extends Element>(el: T): T => {
  document.body.appendChild(el);
  return el;
};

function withRect(el: Element, rect: Partial<DOMRect>): Element {
  el.getBoundingClientRect = () =>
    ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}), ...rect }) as DOMRect;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('getElementByData', () => {
  it('finds a slot by one attribute', () => {
    const container = attach(document.createElement('div'));
    container.innerHTML = '<div data-hour="9"></div><div data-hour="10"></div>';

    const found = getElementByData(container, { hour: '10' });

    expect((found as HTMLElement).dataset['hour']).toBe('10');
  });

  // A scheduler slot is identified by a COMBINATION — a day and an hour — so
  // the attributes have to compose into one selector rather than match any.
  it('requires every attribute to match', () => {
    const container = attach(document.createElement('div'));
    container.innerHTML =
      '<div data-day="mon" data-hour="9"></div><div data-day="tue" data-hour="9"></div>';

    const found = getElementByData(container, { day: 'tue', hour: '9' });

    expect((found as HTMLElement).dataset['day']).toBe('tue');
  });

  it('returns null when nothing matches', () => {
    const container = attach(document.createElement('div'));
    container.innerHTML = '<div data-hour="9"></div>';
    expect(getElementByData(container, { hour: '23' })).toBeNull();
  });

  it('finds a descendant at any depth', () => {
    const container = attach(document.createElement('div'));
    container.innerHTML = '<section><div><span data-hour="9"></span></div></section>';
    expect(getElementByData(container, { hour: '9' })).not.toBeNull();
  });
});

describe('getDataAttributes', () => {
  it('reads every data attribute off an element', () => {
    const el = document.createElement('div');
    el.setAttribute('data-day', 'mon');
    el.setAttribute('data-hour', '9');

    expect(getDataAttributes(el)).toEqual({ day: 'mon', hour: '9' });
  });

  // The keys come back camelCased, because `dataset` is what it reads and that
  // is what `dataset` does. A caller looking for `event-id` finds nothing.
  it('reports a hyphenated attribute under its camelCase name', () => {
    const el = document.createElement('div');
    el.setAttribute('data-event-id', '42');

    expect(getDataAttributes(el)).toEqual({ eventId: '42' });
  });

  it('reports nothing for an element with no data attributes', () => {
    expect(getDataAttributes(document.createElement('div'))).toEqual({});
  });

  it('ignores ordinary attributes', () => {
    const el = document.createElement('div');
    el.setAttribute('class', 'slot');
    el.setAttribute('data-day', 'mon');

    expect(getDataAttributes(el)).toEqual({ day: 'mon' });
  });

  it('keeps an empty value rather than dropping the key', () => {
    const el = document.createElement('div');
    el.setAttribute('data-day', '');
    expect(getDataAttributes(el)).toEqual({ day: '' });
  });
});

describe('findClosestWithData', () => {
  it('walks up to the nearest ancestor carrying the attribute', () => {
    const container = attach(document.createElement('div'));
    container.innerHTML = '<div data-slot="1"><span><em id="leaf"></em></span></div>';

    const found = findClosestWithData(container.querySelector('#leaf')!, 'slot');

    expect((found as HTMLElement).dataset['slot']).toBe('1');
  });

  // `closest` includes the element itself, which is what makes it usable
  // directly on an event target that may or may not be the slot.
  it('matches the element itself', () => {
    const el = attach(document.createElement('div'));
    el.setAttribute('data-slot', '1');
    expect(findClosestWithData(el, 'slot')).toBe(el);
  });

  it('stops at the nearest one when the attribute nests', () => {
    const container = attach(document.createElement('div'));
    container.innerHTML = '<div data-slot="outer"><div data-slot="inner"><em id="leaf"></em></div></div>';

    const found = findClosestWithData(container.querySelector('#leaf')!, 'slot');

    expect((found as HTMLElement).dataset['slot']).toBe('inner');
  });

  it('returns null when no ancestor has it', () => {
    const el = attach(document.createElement('div'));
    expect(findClosestWithData(el, 'slot')).toBeNull();
  });
});

describe('getScrollPosition', () => {
  it('reports both axes', () => {
    const el = attach(document.createElement('div'));
    Object.defineProperty(el, 'scrollTop', { value: 120, configurable: true });
    Object.defineProperty(el, 'scrollLeft', { value: 40, configurable: true });

    expect(getScrollPosition(el)).toEqual({ top: 120, left: 40 });
  });

  it('reports zeroes for an unscrolled element', () => {
    expect(getScrollPosition(attach(document.createElement('div')))).toEqual({ top: 0, left: 0 });
  });
});

describe('scrollToTime', () => {
  function setup(containerTop: number, timeTop: number, scrollTop: number) {
    const container = attach(document.createElement('div'));
    const time = attach(document.createElement('div'));
    withRect(container, { top: containerTop });
    withRect(time, { top: timeTop });
    Object.defineProperty(container, 'scrollTop', { value: scrollTop, configurable: true });
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo;
    return { container, time, scrollTo };
  }

  // The two rects are in viewport coordinates, so the difference has to be
  // added to the CURRENT scroll offset — using the rect difference alone would
  // jump to the wrong place on every scroll but the first.
  it('resolves the target against the current scroll offset', () => {
    const { container, time, scrollTo } = setup(100, 400, 250);

    scrollToTime(container, time);

    expect(scrollTo).toHaveBeenCalledWith({ top: 550, behavior: 'smooth' });
  });

  it('scrolls smoothly by default', () => {
    const { container, time, scrollTo } = setup(0, 0, 0);
    scrollToTime(container, time);
    expect(scrollTo.mock.calls[0][0].behavior).toBe('smooth');
  });

  it('jumps when asked to', () => {
    const { container, time, scrollTo } = setup(0, 0, 0);
    scrollToTime(container, time, 'auto');
    expect(scrollTo.mock.calls[0][0].behavior).toBe('auto');
  });
});

describe('isInViewport', () => {
  const inside = { top: 10, left: 10, bottom: 90, right: 90 };
  const container = () => withRect(attach(document.createElement('div')), { top: 0, left: 0, bottom: 100, right: 100 });

  it('accepts an element fully inside its container', () => {
    expect(isInViewport(withRect(attach(document.createElement('div')), inside), container())).toBe(
      true,
    );
  });

  it.each([
    ['above', { top: -10, left: 10, bottom: 50, right: 90 }],
    ['below', { top: 10, left: 10, bottom: 200, right: 90 }],
    ['left of', { top: 10, left: -5, bottom: 90, right: 90 }],
    ['right of', { top: 10, left: 10, bottom: 90, right: 200 }],
  ])('rejects an element hanging %s the container', (_where, rect) => {
    expect(isInViewport(withRect(attach(document.createElement('div')), rect), container())).toBe(
      false,
    );
  });

  it('accepts an element flush with the edges', () => {
    const flush = { top: 0, left: 0, bottom: 100, right: 100 };
    expect(isInViewport(withRect(attach(document.createElement('div')), flush), container())).toBe(
      true,
    );
  });

  // With no container it measures against the window, which is the case a
  // "scroll the current time into view" check actually uses.
  it('falls back to the window when no container is given', () => {
    const el = withRect(attach(document.createElement('div')), {
      top: 0,
      left: 0,
      bottom: window.innerHeight,
      right: window.innerWidth,
    });
    expect(isInViewport(el)).toBe(true);
  });

  it('rejects an element past the bottom of the window', () => {
    const el = withRect(attach(document.createElement('div')), {
      top: 0,
      left: 0,
      bottom: window.innerHeight + 1,
      right: 10,
    });
    expect(isInViewport(el)).toBe(false);
  });
});

describe('getRelativePosition', () => {
  const target = () => withRect(attach(document.createElement('div')), { top: 100, left: 50 });

  it('subtracts the element origin from a mouse position', () => {
    const el = target();
    const event = new MouseEvent('pointermove', { clientX: 120, clientY: 300 });

    expect(getRelativePosition(event, el)).toEqual({ x: 70, y: 200 });
  });

  // A touch event carries no clientX of its own; reading it as a mouse event
  // yields `undefined` and every downstream calculation becomes NaN.
  it('reads the first touch point for a touch event', () => {
    const el = target();
    const event = new Event('touchmove') as TouchEvent;
    Object.defineProperty(event, 'touches', {
      value: [{ clientX: 120, clientY: 300 } as Touch],
    });

    expect(getRelativePosition(event, el)).toEqual({ x: 70, y: 200 });
  });

  it('reports negatives for a point above and left of the element', () => {
    const el = target();
    const event = new MouseEvent('pointermove', { clientX: 0, clientY: 0 });

    expect(getRelativePosition(event, el)).toEqual({ x: -50, y: -100 });
  });
});

describe('CSS variables', () => {
  it('writes a variable with the leading dashes supplied', () => {
    const el = attach(document.createElement('div'));
    setCSSVariable(el, 'mp-scheduler-slot-height', '40px');
    expect(el.style.getPropertyValue('--mp-scheduler-slot-height')).toBe('40px');
  });

  it('overwrites an existing value', () => {
    const el = attach(document.createElement('div'));
    setCSSVariable(el, 'x', '1px');
    setCSSVariable(el, 'x', '2px');
    expect(el.style.getPropertyValue('--x')).toBe('2px');
  });

  it('reads a variable back', () => {
    const el = attach(document.createElement('div'));
    setCSSVariable(el, 'x', '40px');
    expect(getCSSVariable(el, 'x')).toBe('40px');
  });

  // Computed custom properties come back with their authored whitespace
  // intact, so an untrimmed read cannot be compared or parsed.
  it('trims what it reads', () => {
    const el = attach(document.createElement('div'));
    el.style.setProperty('--x', '  40px  ');
    expect(getCSSVariable(el, 'x')).toBe('40px');
  });

  it('reads an unset variable as empty', () => {
    expect(getCSSVariable(attach(document.createElement('div')), 'nope')).toBe('');
  });
});

describe('class helpers', () => {
  it('adds several classes at once', () => {
    const el = attach(document.createElement('div'));
    addClasses(el, 'a', 'b');
    expect([...el.classList]).toEqual(['a', 'b']);
  });

  // The call sites pass conditional names, so an empty string is routine —
  // and `classList.add('')` throws rather than being ignored.
  it('drops an empty name instead of throwing', () => {
    const el = attach(document.createElement('div'));
    expect(() => addClasses(el, 'a', '')).not.toThrow();
    expect([...el.classList]).toEqual(['a']);
  });

  it('removes several classes at once', () => {
    const el = attach(document.createElement('div'));
    el.className = 'a b c';
    removeClasses(el, 'a', 'c');
    expect([...el.classList]).toEqual(['b']);
  });

  it('ignores a class that is not there', () => {
    const el = attach(document.createElement('div'));
    el.className = 'a';
    expect(() => removeClasses(el, 'zzz', '')).not.toThrow();
    expect([...el.classList]).toEqual(['a']);
  });

  // Conditional, not a flip: it is called on every render with the current
  // state, so a plain toggle would invert on each pass.
  it('sets a class from a condition rather than flipping it', () => {
    const el = attach(document.createElement('div'));

    toggleClass(el, 'selected', true);
    toggleClass(el, 'selected', true);
    expect(el.classList.contains('selected')).toBe(true);

    toggleClass(el, 'selected', false);
    toggleClass(el, 'selected', false);
    expect(el.classList.contains('selected')).toBe(false);
  });
});
