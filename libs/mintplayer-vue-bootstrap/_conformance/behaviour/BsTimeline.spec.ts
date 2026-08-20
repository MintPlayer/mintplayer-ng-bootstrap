import { describe, expect, it } from 'vitest';
import { h, reactive } from 'vue';

import BsTimeline from '../../timeline/src/BsTimeline.vue';
import type { MpTimeline } from '@mintplayer/web-components/timeline';
import type { TimelineItem, TimelineItemContext } from '@mintplayer/web-components/timeline-core';

import { emit, mountEl, mountWrapper } from './harness';

/**
 * Like its React counterpart, the Vue timeline has two mutually exclusive
 * modes — the element renders the rows from an `items` property, or the
 * wrapper *lowers* each item into an `<mp-timeline-item>` so scoped-slot
 * output can reach the named slots. Vue adds a wrinkle React does not have:
 * a scoped slot can appear or disappear at runtime (`<template v-if>`), and
 * `slots.*` is not a reactive dependency, so the wrapper re-syncs on every
 * render rather than only in a watcher. Getting that wrong leaves the element
 * rendering its own rows underneath the lowered ones.
 */

const ITEMS: TimelineItem[] = [
  { id: 'a', title: 'First' },
  { id: 'b', title: 'Second' },
  { id: 'c', title: 'Third' },
];

const rows = (root: Element) => [...root.querySelectorAll('mp-timeline-item')];

describe('BsTimeline — mode selection', () => {
  it('hands the array to the element when there are no slots', () => {
    const { el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', { props: { items: ITEMS } });
    expect(el.items).toEqual(ITEMS);
  });

  it('renders no rows of its own in data mode', () => {
    const { el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', { props: { items: ITEMS } });
    expect(rows(el)).toHaveLength(0);
  });

  it('lowers one row per item once a scoped slot is present', () => {
    const { el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', {
      props: { items: ITEMS },
      slots: { title: () => h('b', 'x') },
    });
    expect(rows(el)).toHaveLength(3);
  });

  // Both halves of the same rule: while lowering, the element must be handed an
  // EMPTY array, not the items — otherwise every row renders twice.
  it('empties the element items property while lowering', () => {
    const { el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', {
      props: { items: ITEMS },
      slots: { title: () => h('b', 'x') },
    });
    expect(el.items).toEqual([]);
  });

  it('passes a default slot through when there are no items', () => {
    const { el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', {
      slots: { default: () => h('mp-timeline-item', { 'item-id': 'x' }) },
    });
    expect(rows(el)).toHaveLength(1);
  });

  it('re-syncs the element when the items array is replaced', async () => {
    const wrapper = mountWrapper(BsTimeline, { props: { items: ITEMS } });
    const el = wrapper.element as unknown as MpTimeline;

    await wrapper.setProps({ items: [ITEMS[0]] });

    expect(el.items).toHaveLength(1);
  });
});

describe('BsTimeline — lowered rows', () => {
  function lowered(items: TimelineItem[]) {
    const { el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', {
      props: { items },
      slots: { title: () => h('b', 'x') },
    });
    return rows(el);
  }

  it('copies the item fields onto each row', () => {
    const [row] = lowered([
      { id: 'a', title: 'T', description: 'D', icon: 'star', color: 'red', cssClass: 'c' },
    ]);
    expect(row.getAttribute('item-id')).toBe('a');
    expect(row.getAttribute('description')).toBe('D');
    expect(row.getAttribute('icon')).toBe('star');
    expect(row.getAttribute('color')).toBe('red');
    expect(row.getAttribute('item-class')).toBe('c');
  });

  // A Date has no useful string form, so the wrapper formats it before it
  // becomes an attribute value.
  it('formats a Date time', () => {
    const time = new Date(2020, 0, 2);
    const [row] = lowered([{ id: 'a', title: 'T', time }]);
    expect(row.getAttribute('time')).toBe(time.toLocaleDateString());
  });

  it('passes a string time through', () => {
    const [row] = lowered([{ id: 'a', title: 'T', time: 'yesterday' }]);
    expect(row.getAttribute('time')).toBe('yesterday');
  });

  it('puts each scoped slot in its own named slot', () => {
    const { el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', {
      props: { items: ITEMS },
      slots: {
        marker: () => h('i', 'M'),
        title: () => h('b', 'T'),
        content: () => h('p', 'C'),
      },
    });
    expect(el.querySelectorAll('[slot="marker"]')).toHaveLength(3);
    expect(el.querySelectorAll('[slot="title"]')).toHaveLength(3);
    expect(el.querySelectorAll('[slot="content"]')).toHaveLength(3);
  });

  // `timestamp` and `opposite` are aliases for one region, not two regions.
  it('routes timestamp and opposite to the same slot', () => {
    const { el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', {
      props: { items: ITEMS },
      slots: { timestamp: () => h('span', 'ts'), opposite: () => h('span', 'op') },
    });
    expect(el.querySelectorAll('[slot="opposite"]')).toHaveLength(6);
  });
});

describe('BsTimeline — the slot context', () => {
  function contexts(props: Record<string, unknown>) {
    const seen: TimelineItemContext[] = [];
    mountWrapper(BsTimeline, {
      props: { items: ITEMS, ...props },
      slots: {
        title: (scope: { ctx: TimelineItemContext }) => {
          seen.push(scope.ctx);
          return h('b', 'x');
        },
      },
    });
    return seen;
  }

  it('numbers items in source order', () => {
    expect(contexts({}).map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it('mirrors only the visual index under reverse', () => {
    const seen = contexts({ reverse: true });
    expect(seen.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(seen.map((c) => c.visualIndex)).toEqual([2, 1, 0]);
  });

  it('marks first and last by visual position', () => {
    const seen = contexts({ reverse: true });
    expect(seen.map((c) => c.isFirst)).toEqual([false, false, true]);
    expect(seen.map((c) => c.isLast)).toEqual([true, false, false]);
  });

  it('alternates sides for align="alternate"', () => {
    expect(contexts({ align: 'alternate' }).map((c) => c.side)).toEqual(['start', 'end', 'start']);
  });

  it('carries the orientation', () => {
    expect(contexts({ orientation: 'horizontal' }).every((c) => c.orientation === 'horizontal')).toBe(
      true,
    );
  });
});

describe('BsTimeline — selection', () => {
  it('leaves selectedIds alone while selection is off', () => {
    const { el } = mountEl<MpTimeline & { selectedIds?: unknown }>(BsTimeline, 'mp-timeline', {
      props: { items: ITEMS },
    });
    expect(el.selectedIds ?? []).toEqual([]);
  });

  it('pushes the selected ids when selection is on', () => {
    const { el } = mountEl<MpTimeline & { selectedIds?: unknown }>(BsTimeline, 'mp-timeline', {
      props: { items: ITEMS, selectable: 'multiple', selection: [ITEMS[0], ITEMS[2]] },
    });
    expect(el.selectedIds).toEqual(['a', 'c']);
  });

  // `deep: true` on the selection watcher exists for exactly this: a consumer
  // that pushes into its own reactive array instead of replacing it.
  it('re-syncs when the selection array is mutated in place', async () => {
    const selection = reactive<TimelineItem[]>([ITEMS[0]]);
    const { wrapper, el } = mountEl<MpTimeline & { selectedIds?: unknown }>(
      BsTimeline,
      'mp-timeline',
      { props: { items: ITEMS, selectable: 'multiple', selection } },
    );

    selection.push(ITEMS[1]);
    await wrapper.vm.$nextTick();

    expect(el.selectedIds).toEqual(['a', 'b']);
  });

  // The consumer gets back its OWN objects, so an identity check against the
  // source array keeps working after a selection round-trip.
  it('maps a selection-change back to the consumer item objects', async () => {
    const { wrapper, el } = mountEl<MpTimeline & { selectedIds?: unknown }>(
      BsTimeline,
      'mp-timeline',
      { props: { items: ITEMS, selectable: 'multiple' } },
    );
    (el as unknown as { selectedIds: unknown[] }).selectedIds = ['b'];

    await emit(el, 'selection-change', { selected: [{ id: 'b', title: 'a copy' }] });

    // By value: Vue delivers `items` through a reactive Proxy, so the object the
    // wrapper maps back to is a proxy of the consumer's item, not the item.
    const emitted = wrapper.emitted('update:selection')![0][0] as TimelineItem[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(ITEMS[1]);
  });

  it('reports the detail as-is when there is no items array', async () => {
    const { wrapper, el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', {
      props: { selectable: 'multiple' },
    });
    const selected = [{ id: 'a', title: 'A' }];

    await emit(el, 'selection-change', { selected });

    expect(wrapper.emitted('update:selection')![0]).toEqual([selected]);
  });

  it('forwards item-click as its detail', async () => {
    const { wrapper, el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', {
      props: { items: ITEMS },
    });

    await emit(el, 'item-click', { item: ITEMS[0], index: 0 });

    expect(wrapper.emitted('item-click')![0]).toEqual([{ item: ITEMS[0], index: 0 }]);
  });

  it('stops emitting once unmounted', async () => {
    const { wrapper, el } = mountEl<MpTimeline>(BsTimeline, 'mp-timeline', {
      props: { items: ITEMS },
    });
    wrapper.unmount();

    el.dispatchEvent(new CustomEvent('item-click', { detail: { item: ITEMS[0], index: 0 } }));

    expect(wrapper.emitted('item-click')).toBeUndefined();
  });
});
