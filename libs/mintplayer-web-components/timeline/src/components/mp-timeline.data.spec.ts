import { afterEach, describe, expect, it } from 'vitest';

import './mp-timeline';
import './mp-timeline-item';
import type { MpTimeline } from './mp-timeline';
import type { TimelineItem } from '@mintplayer/web-components/timeline-core';

/**
 * `<mp-timeline>` in **data mode**: given an `items` array it renders the rows
 * itself, decides which side each falls on, marks the visually last one, and
 * owns selection.
 *
 * The layout decisions are all made once, here, and consumed by CSS in the
 * child — so a wrong `side` or a misplaced `last` is a purely visual break with
 * nothing in the console. And `reverse` is where they interact: it flips the
 * *visual* order without touching the data order, so "which one is last" and
 * "which side is this" stop agreeing with the array index. Every case below
 * that mentions reverse exists because of that split.
 *
 * The companion `.aria.spec.ts` covers roles and names; this covers what the
 * component decided.
 */

const ITEMS: TimelineItem[] = [
  { id: 'a', title: 'First' },
  { id: 'b', title: 'Second' },
  { id: 'c', title: 'Third' },
];

const mounted: MpTimeline[] = [];

function mount(items: TimelineItem[] = ITEMS, props: Partial<MpTimeline> = {}): MpTimeline {
  const el = document.createElement('mp-timeline') as MpTimeline;
  Object.assign(el, props);
  el.items = items;
  document.body.appendChild(el);
  mounted.push(el);
  return el;
}

const settle = (el: MpTimeline) => el.updateComplete;

const rows = (el: MpTimeline) =>
  [...el.shadowRoot!.querySelectorAll<HTMLElement>('mp-timeline-item')];

afterEach(() => {
  while (mounted.length) mounted.pop()!.remove();
});

describe('mp-timeline — rendering from data', () => {
  it('renders one row per item', async () => {
    const el = mount();
    await settle(el);
    expect(rows(el)).toHaveLength(3);
  });

  it('copies the item fields onto each row', async () => {
    const el = mount([
      { id: 'a', title: 'T', description: 'D', icon: 'star', color: 'red', cssClass: 'k' },
    ]);
    await settle(el);

    const row = rows(el)[0];
    expect(row.getAttribute('item-id')).toBe('a');
    expect(row.getAttribute('description')).toBe('D');
    expect(row.getAttribute('icon')).toBe('star');
    expect(row.getAttribute('color')).toBe('red');
    expect(row.getAttribute('item-class')).toBe('k');
  });

  // A Date cannot be an attribute value; without formatting the row would
  // display the default `toString`, timezone and all.
  it('formats a Date time', async () => {
    const time = new Date(2020, 0, 2);
    const el = mount([{ id: 'a', title: 'T', time }]);
    await settle(el);
    expect(rows(el)[0].getAttribute('time')).toBe(time.toLocaleDateString());
  });

  it('passes a string time through', async () => {
    const el = mount([{ id: 'a', title: 'T', time: 'yesterday' }]);
    await settle(el);
    expect(rows(el)[0].getAttribute('time')).toBe('yesterday');
  });

  it('marks a disabled item', async () => {
    const el = mount([{ id: 'a', title: 'T', disabled: true }]);
    await settle(el);
    expect(rows(el)[0].hasAttribute('disabled')).toBe(true);
  });

  it('re-renders when the array is replaced', async () => {
    const el = mount();
    await settle(el);

    el.items = [{ id: 'z', title: 'Only' }];
    await settle(el);

    expect(rows(el)).toHaveLength(1);
  });

  it('falls back to the slot when the array is emptied', async () => {
    const el = mount();
    await settle(el);

    el.items = null;
    await settle(el);

    expect(rows(el)).toHaveLength(0);
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull();
  });
});

describe('mp-timeline — sides and the last row', () => {
  const sidesOf = (el: MpTimeline) => rows(el).map((r) => r.getAttribute('side'));
  const lastIndex = (el: MpTimeline) => rows(el).findIndex((r) => r.hasAttribute('last'));

  it('puts everything on one side by default', async () => {
    const el = mount();
    await settle(el);
    expect(sidesOf(el)).toEqual(['start', 'start', 'start']);
  });

  it('honours align="end"', async () => {
    const el = mount(ITEMS, { align: 'end' });
    await settle(el);
    expect(sidesOf(el)).toEqual(['end', 'end', 'end']);
  });

  it('alternates for align="alternate"', async () => {
    const el = mount(ITEMS, { align: 'alternate' });
    await settle(el);
    expect(sidesOf(el)).toEqual(['start', 'end', 'start']);
  });

  it('starts on the other side for align="alternate-reverse"', async () => {
    const el = mount(ITEMS, { align: 'alternate-reverse' });
    await settle(el);
    expect(sidesOf(el)).toEqual(['end', 'start', 'end']);
  });

  // Alternation follows the VISUAL order, so under reverse the first item in
  // the array is the last one shown and takes the side that position implies.
  it('alternates against the visual order under reverse', async () => {
    const el = mount(ITEMS, { align: 'alternate', reverse: true });
    await settle(el);
    expect(sidesOf(el)).toEqual(['start', 'end', 'start']);
  });

  // `last` drives the connector: the final row has no line running on from it.
  // Under reverse that is the FIRST item in the array.
  it('marks the final row as last', async () => {
    const el = mount();
    await settle(el);
    expect(lastIndex(el)).toBe(2);
  });

  it('marks the first row as last under reverse', async () => {
    const el = mount(ITEMS, { reverse: true });
    await settle(el);
    expect(lastIndex(el)).toBe(0);
  });

  it('marks exactly one row as last', async () => {
    const el = mount();
    await settle(el);
    expect(rows(el).filter((r) => r.hasAttribute('last'))).toHaveLength(1);
  });

  it('tells each row the orientation', async () => {
    const el = mount(ITEMS, { orientation: 'horizontal' });
    await settle(el);
    expect(rows(el).every((r) => r.getAttribute('orientation') === 'horizontal')).toBe(true);
  });

  it('re-lays-out when align changes after mount', async () => {
    const el = mount();
    await settle(el);

    el.align = 'alternate';
    await settle(el);

    expect(sidesOf(el)).toEqual(['start', 'end', 'start']);
  });
});

describe('mp-timeline — selection', () => {
  const selectedIds = (el: MpTimeline) =>
    rows(el)
      .filter((r) => r.hasAttribute('selected'))
      .map((r) => r.getAttribute('item-id'));

  it('selects nothing while selection is off', async () => {
    const el = mount();
    await settle(el);

    rows(el)[0].click();
    await settle(el);

    expect(selectedIds(el)).toEqual([]);
  });

  it('selects a clicked row in single mode', async () => {
    const el = mount(ITEMS, { selectable: 'single' });
    await settle(el);

    rows(el)[1].click();
    await settle(el);

    expect(selectedIds(el)).toEqual(['b']);
  });

  it('replaces the selection in single mode', async () => {
    const el = mount(ITEMS, { selectable: 'single' });
    await settle(el);

    rows(el)[0].click();
    await settle(el);
    rows(el)[2].click();
    await settle(el);

    expect(selectedIds(el)).toEqual(['c']);
  });

  /*
   * Multiple mode follows the desktop convention rather than a touch-style
   * "every tap toggles": a plain click REPLACES the selection, and adding
   * requires the modifier. The alternative makes it impossible to start over
   * with one click once several rows are selected.
   */
  it('replaces the selection on a plain click even in multiple mode', async () => {
    const el = mount(ITEMS, { selectable: 'multiple' });
    await settle(el);

    rows(el)[0].click();
    await settle(el);
    rows(el)[2].click();
    await settle(el);

    expect(selectedIds(el)).toEqual(['c']);
  });

  it('adds to the selection with the modifier held', async () => {
    const el = mount(ITEMS, { selectable: 'multiple' });
    await settle(el);

    rows(el)[0].click();
    await settle(el);
    rows(el)[2].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ctrlKey: true }));
    await settle(el);

    expect(selectedIds(el)).toEqual(['a', 'c']);
  });

  it('accepts the Mac modifier too', async () => {
    const el = mount(ITEMS, { selectable: 'multiple' });
    await settle(el);

    rows(el)[0].click();
    await settle(el);
    rows(el)[1].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, metaKey: true }));
    await settle(el);

    expect(selectedIds(el)).toEqual(['a', 'b']);
  });

  it('removes an already-selected row with the modifier', async () => {
    const el = mount(ITEMS, { selectable: 'multiple' });
    el.selectedIds = ['a', 'b'];
    await settle(el);

    rows(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ctrlKey: true }));
    await settle(el);

    expect(selectedIds(el)).toEqual(['b']);
  });

  // Shift extends from the row the last plain click anchored on.
  it('selects a range with Shift held', async () => {
    const el = mount(ITEMS, { selectable: 'multiple' });
    await settle(el);

    rows(el)[0].click();
    await settle(el);
    rows(el)[2].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, shiftKey: true }));
    await settle(el);

    expect(selectedIds(el)).toEqual(['a', 'b', 'c']);
  });

  it('selects a range dragged backwards just the same', async () => {
    const el = mount(ITEMS, { selectable: 'multiple' });
    await settle(el);

    rows(el)[2].click();
    await settle(el);
    rows(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, shiftKey: true }));
    await settle(el);

    expect(selectedIds(el)).toEqual(['a', 'b', 'c']);
  });

  // Single mode has no accumulation to offer, so a modifier changes nothing.
  it('ignores the modifier in single mode', async () => {
    const el = mount(ITEMS, { selectable: 'single' });
    await settle(el);

    rows(el)[0].click();
    await settle(el);
    rows(el)[2].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ctrlKey: true }));
    await settle(el);

    expect(selectedIds(el)).toEqual(['c']);
  });

  // A disabled row is not a target: selecting one would put the timeline in a
  // state the consumer said was impossible.
  it('ignores a click on a disabled row', async () => {
    const el = mount([{ id: 'a', title: 'A', disabled: true }], { selectable: 'single' });
    await settle(el);

    rows(el)[0].click();
    await settle(el);

    expect(selectedIds(el)).toEqual([]);
  });

  it('accepts a selection set from outside', async () => {
    const el = mount(ITEMS, { selectable: 'multiple' });
    el.selectedIds = ['a', 'c'];
    await settle(el);

    expect(selectedIds(el)).toEqual(['a', 'c']);
  });

  it('reports the current selection through the property', async () => {
    const el = mount(ITEMS, { selectable: 'single' });
    await settle(el);

    rows(el)[1].click();
    await settle(el);

    expect(el.selectedIds).toEqual(['b']);
  });

  it('clears a selection set to an empty array', async () => {
    const el = mount(ITEMS, { selectable: 'multiple' });
    el.selectedIds = ['a'];
    await settle(el);

    el.selectedIds = [];
    await settle(el);

    expect(selectedIds(el)).toEqual([]);
  });

  it('announces a selection change', async () => {
    const el = mount(ITEMS, { selectable: 'single' });
    await settle(el);
    const seen: CustomEvent[] = [];
    el.addEventListener('selection-change', (e) => seen.push(e as CustomEvent));

    rows(el)[0].click();
    await settle(el);

    expect(seen).toHaveLength(1);
    expect(seen[0].detail.selected.map((i: TimelineItem) => i.id)).toEqual(['a']);
  });

  // A no-op click should stay silent, or a consumer re-rendering on the event
  // churns on every click inside an already-selected row.
  it('stays silent when the selection does not actually change', async () => {
    const el = mount(ITEMS, { selectable: 'single' });
    await settle(el);
    rows(el)[0].click();
    await settle(el);

    const seen: CustomEvent[] = [];
    el.addEventListener('selection-change', (e) => seen.push(e as CustomEvent));
    rows(el)[0].click();
    await settle(el);

    expect(seen).toHaveLength(0);
  });

  // Items with no id fall back to their index, so a consumer can hand over a
  // bare array without inventing keys.
  it('identifies an id-less item by its position', async () => {
    const el = mount([{ title: 'A' }, { title: 'B' }], { selectable: 'single' });
    await settle(el);

    rows(el)[1].click();
    await settle(el);

    expect(el.selectedIds).toEqual([1]);
  });
});

describe('mp-timeline — clicking a row', () => {
  it('reports the item that was clicked', async () => {
    const el = mount();
    await settle(el);
    const seen: CustomEvent[] = [];
    el.addEventListener('item-click', (e) => seen.push(e as CustomEvent));

    rows(el)[1].click();
    await settle(el);

    expect(seen).toHaveLength(1);
    expect(seen[0].detail.item.id).toBe('b');
    expect(seen[0].detail.index).toBe(1);
  });

  it('reports a click even when selection is on', async () => {
    const el = mount(ITEMS, { selectable: 'single' });
    await settle(el);
    const seen: CustomEvent[] = [];
    el.addEventListener('item-click', (e) => seen.push(e as CustomEvent));

    rows(el)[0].click();
    await settle(el);

    expect(seen).toHaveLength(1);
  });

  it('says nothing for a click that missed every row', async () => {
    const el = mount();
    await settle(el);
    const seen: CustomEvent[] = [];
    el.addEventListener('item-click', (e) => seen.push(e as CustomEvent));

    el.shadowRoot!.querySelector<HTMLElement>('.timeline')!.click();
    await settle(el);

    expect(seen).toHaveLength(0);
  });
});
