import { afterEach, describe, expect, it } from 'vitest';
import type { TimelineItem, TimelineItemClickDetail, TimelineSelectionChangeDetail } from '@mintplayer/ui-core/timeline';
import './index';
import type { MpTimeline, MpTimelineItem } from './index';

/**
 * `<mp-timeline>` is generated from @mintplayer/ui-core/timeline (#437) and
 * renders in the light DOM: the rows are its own children, data rows and
 * declarative `<mp-timeline-item>`s alike. Layout is CSS on the root classes,
 * so these specs pin roles, the roving tab stop and selection — the parts a
 * stylesheet cannot carry.
 */

const ITEMS: TimelineItem[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta', disabled: true },
  { id: 'c', title: 'Gamma' },
];

const mounted: HTMLElement[] = [];
afterEach(() => mounted.splice(0).forEach((el) => el.remove()));

async function settle(el: MpTimeline): Promise<void> {
  await el.updateComplete;
  // The tab-stop sync runs from a microtask / MutationObserver, then re-renders.
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
  await Promise.all([...el.querySelectorAll<MpTimelineItem>('mp-timeline-item')].map((i) => i.updateComplete));
}

async function mount(patch: Partial<MpTimeline> = {}, inner = ''): Promise<MpTimeline> {
  const el = document.createElement('mp-timeline') as MpTimeline;
  Object.assign(el, patch);
  el.innerHTML = inner;
  document.body.appendChild(el);
  mounted.push(el);
  await settle(el);
  return el;
}

const rows = (el: MpTimeline) => [...el.querySelectorAll<HTMLElement>('[data-tl-key]')];
const tabindexes = (el: MpTimeline) => rows(el).map((r) => r.getAttribute('tabindex'));
const selected = (el: MpTimeline) => rows(el).map((r) => r.getAttribute('aria-selected'));
const key = (el: MpTimeline, k: string) => rows(el)[0].dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('mp-timeline — roles follow the interaction mode', () => {
  it('is an unnamed list of listitems with no tab stops by default', async () => {
    const el = await mount({ items: ITEMS });
    expect(el.getAttribute('role')).toBe('list');
    expect(el.hasAttribute('aria-label')).toBe(false);
    expect(el.hasAttribute('aria-orientation')).toBe(false);
    expect(rows(el).map((r) => r.getAttribute('role'))).toEqual(['listitem', 'listitem', 'listitem']);
    expect(tabindexes(el)).toEqual([null, null, null]);
  });

  it('becomes a listbox of options with one tab stop while selectable', async () => {
    const el = await mount({ items: ITEMS, selectable: 'multiple', orientation: 'horizontal' });
    expect(el.getAttribute('role')).toBe('listbox');
    expect(el.getAttribute('aria-orientation')).toBe('horizontal');
    expect(el.getAttribute('aria-multiselectable')).toBe('true');
    expect(selected(el)).toEqual(['false', 'false', 'false']);
    expect(tabindexes(el)).toEqual(['0', '-1', '-1']);
  });

  it('becomes a group of buttons when only activatable', async () => {
    const el = await mount({ items: ITEMS, activatable: true });
    expect(el.getAttribute('role')).toBe('group');
    expect(rows(el)[0].getAttribute('role')).toBe('button');
    expect(rows(el)[1].getAttribute('aria-disabled')).toBe('true');
  });

  it('is named by input-label, and a host aria-label wins', async () => {
    const el = await mount({ items: ITEMS, inputLabel: 'History' });
    expect(el.getAttribute('aria-label')).toBe('History');
    // The consumer's own aria-label, present when the element connects, wins.
    const named = document.createElement('mp-timeline') as MpTimeline;
    named.setAttribute('aria-label', 'Host');
    named.inputLabel = 'Other';
    document.body.appendChild(named);
    mounted.push(named);
    await settle(named);
    expect(named.getAttribute('aria-label')).toBe('Host');
  });

  it('lays out through the root classes', async () => {
    const el = await mount({ items: ITEMS, align: 'alternate', reverse: true });
    expect([...el.classList]).toEqual(expect.arrayContaining(['timeline', 'timeline-vertical', 'timeline-align-alternate', 'timeline-reverse']));
  });
});

describe('mp-timeline — keyboard', () => {
  it('roves with the arrows, skipping a disabled row and wrapping', async () => {
    const el = await mount({ items: ITEMS, selectable: 'single' });
    key(el, 'ArrowDown');
    await settle(el);
    expect(tabindexes(el)).toEqual(['-1', '-1', '0']);
    rows(el)[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle(el);
    expect(tabindexes(el)).toEqual(['0', '-1', '-1']);
  });

  it('jumps to the last enabled row with End', async () => {
    const el = await mount({ items: ITEMS, selectable: 'single' });
    key(el, 'End');
    await settle(el);
    expect(tabindexes(el)).toEqual(['-1', '-1', '0']);
  });

  it('selects with Enter and reports keys plus items', async () => {
    const el = await mount({ items: ITEMS, selectable: 'single' });
    const keys: (readonly string[])[] = [];
    const changes: TimelineSelectionChangeDetail[] = [];
    el.addEventListener('selectedidschange', (e) => keys.push((e as CustomEvent).detail));
    el.addEventListener('selectionchanged', (e) => changes.push((e as CustomEvent).detail));
    key(el, 'Enter');
    await settle(el);
    expect(keys).toEqual([['a']]);
    expect(changes[0].selected).toEqual([ITEMS[0]]);
    expect(el.selectedIds).toEqual(['a']);
    expect(selected(el)).toEqual(['true', 'false', 'false']);
  });

  it('reports Enter and Space as an itemclick when only activatable', async () => {
    const el = await mount({ items: ITEMS, activatable: true });
    const clicks: TimelineItemClickDetail[] = [];
    el.addEventListener('itemclick', (e) => clicks.push((e as CustomEvent).detail));
    key(el, 'Enter');
    key(el, ' ');
    expect(clicks.map((c) => [c.item, c.index])).toEqual([[ITEMS[0], 0], [ITEMS[0], 0]]);
  });

  it('does nothing while not interactive', async () => {
    const el = await mount({ items: ITEMS });
    const clicks: unknown[] = [];
    el.addEventListener('itemclick', (e) => clicks.push(e));
    key(el, 'Enter');
    expect(clicks).toEqual([]);
  });
});

describe('mp-timeline — selection by pointer', () => {
  const click = (row: HTMLElement, init: MouseEventInit = {}) => row.dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }));
  const MANY: TimelineItem[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('replaces in single mode and ignores the modifier', async () => {
    const el = await mount({ items: MANY, selectable: 'single' });
    click(rows(el)[0]);
    click(rows(el)[2], { ctrlKey: true });
    await settle(el);
    expect(el.selectedIds).toEqual(['c']);
  });

  it('toggles with ctrl or meta, and selects a range with shift, in multiple mode', async () => {
    const el = await mount({ items: MANY, selectable: 'multiple' });
    click(rows(el)[0]);
    click(rows(el)[1], { metaKey: true });
    click(rows(el)[0], { ctrlKey: true });
    expect(el.selectedIds).toEqual(['b']);
    // The anchor is the last row clicked without shift (a, toggled off): the range runs a..d.
    click(rows(el)[3], { shiftKey: true });
    await settle(el);
    expect([...el.selectedIds].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(tabindexes(el)).toEqual(['-1', '-1', '-1', '0']);
  });

  it('ignores a disabled row', async () => {
    const el = await mount({ items: ITEMS, selectable: 'single' });
    click(rows(el)[1]);
    expect(el.selectedIds).toEqual([]);
  });

  it('accepts a selection from outside and stays silent when nothing changes', async () => {
    const el = await mount({ items: ITEMS, selectable: 'single', selectedIds: ['c'] });
    expect(selected(el)).toEqual(['false', 'false', 'true']);
    const changes: unknown[] = [];
    el.addEventListener('selectionchanged', (e) => changes.push(e));
    click(rows(el)[2]);
    expect(changes).toEqual([]);
  });

  it('identifies an id-less item by its position', async () => {
    const el = await mount({ items: [{ title: 'x' }, { title: 'y' }], selectable: 'single' });
    click(rows(el)[1]);
    expect(el.selectedIds).toEqual(['1']);
  });
});

describe('mp-timeline — declarative items', () => {
  const ITEMS_HTML =
    '<mp-timeline-item item-id="a" item-title="Alpha"></mp-timeline-item>' +
    '<mp-timeline-item item-id="b" item-title="Beta" disabled></mp-timeline-item>' +
    '<mp-timeline-item item-id="c" item-title="Gamma"><p>Body</p></mp-timeline-item>';

  it('renders each item as a row of the timeline', async () => {
    const el = await mount({}, ITEMS_HTML);
    expect(rows(el).map((r) => r.tagName)).toEqual(['MP-TIMELINE-ITEM', 'MP-TIMELINE-ITEM', 'MP-TIMELINE-ITEM']);
    expect(rows(el).map((r) => r.querySelector('.timeline-heading')?.textContent?.trim())).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(rows(el)[2].querySelector('.timeline-body p')?.textContent).toBe('Body');
  });

  it('upgrades items to options with one tab stop once selectable', async () => {
    const el = await mount({}, ITEMS_HTML);
    el.selectable = 'single';
    await settle(el);
    expect(rows(el).map((r) => r.getAttribute('role'))).toEqual(['option', 'option', 'option']);
    expect(tabindexes(el)).toEqual(['0', '-1', '-1']);
  });

  it('selects an item by its item-id and rebuilds its model from its text', async () => {
    const el = await mount({ selectable: 'single' }, ITEMS_HTML);
    const changes: TimelineSelectionChangeDetail[] = [];
    el.addEventListener('selectionchanged', (e) => changes.push((e as CustomEvent).detail));
    rows(el)[2].click();
    await settle(el);
    expect(el.selectedIds).toEqual(['c']);
    expect(changes[0].selected[0]).toMatchObject({ id: 'c', title: 'Gamma', disabled: false });
    expect(selected(el)).toEqual(['false', 'false', 'true']);
  });

  it('moves the tab stop off an item disabled at runtime', async () => {
    const el = await mount({ activatable: true }, ITEMS_HTML);
    expect(tabindexes(el)[0]).toBe('0');
    (rows(el)[0] as MpTimelineItem).disabled = true;
    await settle(el);
    expect(tabindexes(el)).toEqual(['-1', '-1', '0']);
  });

  it('is a presentational listitem outside a timeline', async () => {
    const item = document.createElement('mp-timeline-item') as MpTimelineItem;
    item.itemTitle = 'Alone';
    document.body.appendChild(item);
    mounted.push(item);
    await item.updateComplete;
    expect(item.getAttribute('role')).toBe('listitem');
    expect(item.hasAttribute('tabindex')).toBe(false);
  });
});
