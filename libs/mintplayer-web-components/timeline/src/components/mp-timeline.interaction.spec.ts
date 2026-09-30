import { afterEach, describe, expect, it, vi } from 'vitest';

import './mp-timeline';
import type { MpTimeline } from './mp-timeline';
import type { TimelineItem, TimelineItemClickDetail } from '@mintplayer/web-components/timeline-core';

/**
 * `<mp-timeline>` interaction outside selection, and its property/attribute
 * surface.
 *
 * `activatable` is the mode for click-only consumers: no selection, but the
 * rows must still be keyboard-operable, because an `item-click` a keyboard user
 * cannot fire is a pointer-only feature. The pointer and keyboard paths share
 * one emission, so each assertion here pairs the two.
 *
 * The data-mode selection matrix lives in `.data.spec.ts`, roles and names in
 * `.aria.spec.ts`, and the declarative light-DOM bookkeeping in
 * `.declarative.spec.ts`.
 */

const ITEMS: TimelineItem[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma' },
];

const mounted: MpTimeline[] = [];

async function mount(setup?: (el: MpTimeline) => void): Promise<MpTimeline> {
  const el = document.createElement('mp-timeline') as MpTimeline;
  setup?.(el);
  document.body.appendChild(el);
  mounted.push(el);
  await flush(el);
  return el;
}

async function flush(el: MpTimeline): Promise<void> {
  await el.updateComplete;
  // The roving-focus move hops a frame before it focuses.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await el.updateComplete;
}

const rows = (el: MpTimeline) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('mp-timeline-item'));

const tabindexes = (el: MpTimeline) => rows(el).map((r) => r.getAttribute('tabindex'));

function key(target: HTMLElement, k: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
}

function clicks(el: MpTimeline): TimelineItemClickDetail[] {
  const seen: TimelineItemClickDetail[] = [];
  el.addEventListener('item-click', (e) => seen.push((e as CustomEvent<TimelineItemClickDetail>).detail));
  return seen;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!.remove();
});

describe('mp-timeline — activatable rows are operable from the keyboard', () => {
  const activatable = (items: TimelineItem[] = ITEMS) =>
    mount((host) => {
      host.items = items;
      host.activatable = true;
    });

  it('gives the rows exactly one tab stop, on the first row', async () => {
    const el = await activatable();
    expect(tabindexes(el)).toEqual(['0', '-1', '-1']);
  });

  it('reports Enter on a row as an item-click for that row', async () => {
    const el = await activatable();
    const seen = clicks(el);
    const ev = key(rows(el)[1], 'Enter');
    expect(ev.defaultPrevented).toBe(true);
    expect(seen.map((d) => [d.item.id, d.index])).toEqual([['b', 1]]);
    expect(seen[0].originalEvent).toBe(ev);
  });

  it('reports Space on a row as an item-click too', async () => {
    const el = await activatable();
    const seen = clicks(el);
    key(rows(el)[2], ' ');
    expect(seen.map((d) => d.index)).toEqual([2]);
  });

  it('never activates a disabled row from the keyboard', async () => {
    const el = await activatable([ITEMS[0], { id: 'b', title: 'Beta', disabled: true }]);
    const seen = clicks(el);
    key(rows(el)[1], 'Enter');
    expect(seen).toEqual([]);
  });

  it('ignores Enter that does not come from a row', async () => {
    const el = await activatable();
    const seen = clicks(el);
    const list = el.shadowRoot!.querySelector('.timeline') as HTMLElement;
    const ev = key(list, 'Enter');
    expect(seen).toEqual([]);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('roves with the arrows in both axes, wrapping at the ends', async () => {
    const el = await activatable();
    key(rows(el)[0], 'ArrowRight');
    await flush(el);
    expect(tabindexes(el)).toEqual(['-1', '0', '-1']);

    key(rows(el)[1], 'ArrowUp');
    await flush(el);
    expect(tabindexes(el)).toEqual(['0', '-1', '-1']);

    key(rows(el)[0], 'ArrowLeft');
    await flush(el);
    expect(tabindexes(el)).toEqual(['-1', '-1', '0']);
  });

  it('moves real focus onto the row it roves to', async () => {
    const el = await activatable();
    key(rows(el)[0], 'End');
    await flush(el);
    expect(el.shadowRoot!.activeElement).toBe(rows(el)[2]);
  });

  it('jumps to the first and last enabled rows with Home and End', async () => {
    const el = await activatable([
      { id: 'a', title: 'Alpha', disabled: true },
      ITEMS[1],
      ITEMS[2],
      { id: 'd', title: 'Delta', disabled: true },
    ]);
    key(rows(el)[1], 'End');
    await flush(el);
    expect(tabindexes(el)).toEqual(['-1', '-1', '0', '-1']);

    key(rows(el)[2], 'Home');
    await flush(el);
    expect(tabindexes(el)).toEqual(['-1', '0', '-1', '-1']);
  });

  it('starts roving from the tab stop when focus is not on a row', async () => {
    const el = await activatable();
    const list = el.shadowRoot!.querySelector('.timeline') as HTMLElement;
    key(list, 'ArrowDown');
    await flush(el);
    expect(tabindexes(el)).toEqual(['-1', '0', '-1']);
  });

  // With nothing enabled there is nowhere to go: the tab stop must not land on
  // a disabled row, and nothing is focused.
  it('stays put when every row is disabled', async () => {
    const el = await activatable(ITEMS.map((it) => ({ ...it, disabled: true })));
    expect(tabindexes(el)).toEqual(['-1', '-1', '-1']);
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    key(rows(el)[0], 'ArrowDown');
    await flush(el);
    expect(tabindexes(el)).toEqual(['-1', '-1', '-1']);
    expect(focus).not.toHaveBeenCalled();
    focus.mockRestore();
  });

  it('leaves other keys to the page', async () => {
    const el = await activatable();
    const ev = key(rows(el)[0], 'a');
    expect(ev.defaultPrevented).toBe(false);
  });

  // A click is an activation too; the clicked row becomes where Tab returns.
  it('moves the tab stop to a clicked row', async () => {
    const el = await activatable();
    const seen = clicks(el);
    rows(el)[2].click();
    await flush(el);
    expect(seen.map((d) => d.index)).toEqual([2]);
    expect(tabindexes(el)).toEqual(['-1', '-1', '0']);
  });

  it('leaves the tab stop alone for a click on a disabled row', async () => {
    const el = await activatable([ITEMS[0], { id: 'b', title: 'Beta', disabled: true }]);
    const seen = clicks(el);
    rows(el)[1].click();
    await flush(el);
    expect(seen).toEqual([]);
    expect(tabindexes(el)).toEqual(['0', '-1']);
  });
});

describe('mp-timeline — a plain timeline is not a widget', () => {
  it('leaves every key to the page when neither selectable nor activatable', async () => {
    const el = await mount((host) => (host.items = ITEMS));
    const seen = clicks(el);
    const events = ['ArrowDown', 'Home', 'Enter'].map((k) => key(rows(el)[0], k));
    expect(events.map((e) => e.defaultPrevented)).toEqual([false, false, false]);
    expect(seen).toEqual([]);
  });

  it('still reports a click without moving any tab stop', async () => {
    const el = await mount((host) => (host.items = ITEMS));
    const seen = clicks(el);
    rows(el)[1].click();
    await flush(el);
    expect(seen.map((d) => d.index)).toEqual([1]);
    expect(rows(el).some((r) => r.hasAttribute('tabindex'))).toBe(false);
  });
});

describe('mp-timeline — selection keys', () => {
  it('toggles with Space and replaces with Enter in multiple mode', async () => {
    const el = await mount((host) => {
      host.items = ITEMS;
      host.selectable = 'multiple';
      host.selectedIds = ['a'];
    });
    key(rows(el)[1], ' ');
    expect(el.selectedIds).toEqual(['a', 'b']);
    key(rows(el)[1], ' ');
    expect(el.selectedIds).toEqual(['a']);
    key(rows(el)[2], 'Enter');
    expect(el.selectedIds).toEqual(['c']);
  });

  it('extends a range with Shift+Enter from the last anchor', async () => {
    const el = await mount((host) => {
      host.items = ITEMS;
      host.selectable = 'multiple';
    });
    key(rows(el)[0], 'Enter');
    key(rows(el)[2], 'Enter', { shiftKey: true });
    expect(el.selectedIds).toEqual(['a', 'b', 'c']);
  });

  it('skips disabled rows inside a range', async () => {
    const el = await mount((host) => {
      host.items = [ITEMS[0], { id: 'b', title: 'Beta', disabled: true }, ITEMS[2]];
      host.selectable = 'multiple';
    });
    rows(el)[0].click();
    rows(el)[2].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, shiftKey: true }));
    expect(el.selectedIds).toEqual(['a', 'c']);
  });

  it('does not emit item-click from the keyboard while selecting', async () => {
    const el = await mount((host) => {
      host.items = ITEMS;
      host.selectable = 'single';
    });
    const seen = clicks(el);
    key(rows(el)[1], 'Enter');
    expect(seen).toEqual([]);
    expect(el.selectedIds).toEqual(['b']);
  });
});

describe('mp-timeline — properties reflect and normalise', () => {
  it('reflects each layout property onto its attribute', async () => {
    const el = await mount();
    el.orientation = 'horizontal';
    el.align = 'alternate';
    el.reverse = true;
    el.selectable = 'multiple';
    el.activatable = true;
    el.isServerSide = true;
    expect(el.getAttribute('orientation')).toBe('horizontal');
    expect(el.getAttribute('align')).toBe('alternate');
    expect(el.hasAttribute('reverse')).toBe(true);
    expect(el.getAttribute('selectable')).toBe('multiple');
    expect(el.hasAttribute('activatable')).toBe(true);
    expect(el.hasAttribute('is-server-side')).toBe(true);

    el.reverse = false;
    el.activatable = false;
    el.isServerSide = false;
    expect(el.hasAttribute('reverse')).toBe(false);
    expect(el.hasAttribute('activatable')).toBe(false);
    expect(el.hasAttribute('is-server-side')).toBe(false);
  });

  it('falls back to the default for an unknown value', async () => {
    const el = await mount((host) => {
      host.orientation = 'horizontal';
      host.align = 'end';
      host.selectable = 'single';
    });
    el.orientation = 'diagonal' as never;
    el.align = 'middle' as never;
    el.selectable = 'some' as never;
    expect([el.orientation, el.align, el.selectable]).toEqual(['vertical', 'start', 'none']);
    expect(el.getAttribute('align')).toBe('start');
  });

  it('adopts attribute writes, reading "false" as off', async () => {
    const el = await mount();
    el.setAttribute('orientation', 'horizontal');
    el.setAttribute('align', 'alternate-reverse');
    el.setAttribute('reverse', 'false');
    el.setAttribute('selectable', 'bogus');
    el.setAttribute('is-server-side', '');
    el.setAttribute('activatable', 'false');
    expect(el.orientation).toBe('horizontal');
    expect(el.align).toBe('alternate-reverse');
    expect(el.reverse).toBe(false);
    expect(el.selectable).toBe('none');
    expect(el.isServerSide).toBe(true);
    expect(el.activatable).toBe(false);

    el.removeAttribute('align');
    el.removeAttribute('is-server-side');
    expect(el.align).toBe('start');
    expect(el.isServerSide).toBe(false);
  });

  it('names the list from the inputLabel property', async () => {
    const el = await mount((host) => (host.items = ITEMS));
    el.inputLabel = 'Releases';
    await flush(el);
    const list = el.shadowRoot!.querySelector('.timeline')!;
    expect(el.inputLabel).toBe('Releases');
    expect(list.getAttribute('aria-label')).toBe('Releases');

    el.inputLabel = null;
    await flush(el);
    expect(list.hasAttribute('aria-label')).toBe(false);
  });

  // An IDREF resolves only within its own tree: copying the host's reference
  // attributes onto the in-shadow list would point them at nothing.
  it('never copies host aria-labelledby / aria-describedby into the shadow root', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = await mount((host) => (host.items = ITEMS));
    el.setAttribute('aria-labelledby', 'outside-label');
    el.setAttribute('aria-describedby', 'outside-help');
    await flush(el);
    const list = el.shadowRoot!.querySelector('.timeline')!;
    expect(list.hasAttribute('aria-labelledby')).toBe(false);
    expect(list.hasAttribute('aria-describedby')).toBe(false);
    warn.mockRestore();
  });

  it('treats a null items array as empty', async () => {
    const el = await mount((host) => (host.items = ITEMS));
    el.items = null;
    await flush(el);
    expect(el.items).toEqual([]);
    expect(rows(el)).toEqual([]);
  });

  it('treats a null selection as empty', async () => {
    const el = await mount((host) => {
      host.items = ITEMS;
      host.selectable = 'single';
      host.selectedIds = ['a'];
    });
    el.selectedIds = null;
    expect(el.selectedIds).toEqual([]);
  });
});
