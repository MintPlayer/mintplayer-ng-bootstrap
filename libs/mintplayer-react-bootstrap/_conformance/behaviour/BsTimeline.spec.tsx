import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { BsTimeline, BsTimelineItem } from '@mintplayer/react-bootstrap/timeline';
import type { MpTimeline } from '@mintplayer/web-components/timeline';
import type { TimelineItem, TimelineItemContext } from '@mintplayer/web-components/timeline-core';

import { emit, render, renderEl } from './harness';

/**
 * `BsTimeline` is the one React wrapper that is a real component rather than a
 * `createComponent` call, and it has three mutually exclusive modes chosen by
 * which props are present:
 *
 *   - **data mode** — `items` and no render-props: the array goes to the
 *     element as a property and the element renders the rows.
 *   - **lowering mode** — `items` AND at least one render-prop: the wrapper
 *     renders one `<BsTimelineItem>` per item and puts the render-prop output
 *     in named slots, because React nodes cannot cross into the WC's shadow DOM.
 *   - **children mode** — no `items`: declarative children pass through.
 *
 * Choosing the wrong mode is silent: the timeline renders, just empty or
 * without the consumer's templates. The selection round-trip is the other
 * silent one — the WC reports selected rows by id, and the wrapper maps them
 * back to the consumer's own objects so identity holds against the source array.
 */

const ITEMS: TimelineItem[] = [
  { id: 'a', title: 'First', description: 'one' },
  { id: 'b', title: 'Second', description: 'two' },
  { id: 'c', title: 'Third', description: 'three' },
];

const items = (host: HTMLElement) => [...host.querySelectorAll('mp-timeline-item')];

describe('BsTimeline — mode selection', () => {
  it('sets items as an element property in data mode', async () => {
    const el = await renderEl<MpTimeline>(<BsTimeline items={ITEMS} />, 'mp-timeline');
    expect(el.items).toEqual(ITEMS);
  });

  // The element owns rendering in data mode; a wrapper that also lowered would
  // double every row.
  it('renders no item elements of its own in data mode', async () => {
    const host = await render(<BsTimeline items={ITEMS} />);
    expect(items(host)).toHaveLength(0);
  });

  it('passes declarative children straight through', async () => {
    const host = await render(
      <BsTimeline>
        <BsTimelineItem itemId="x" title="Manual" />
      </BsTimeline>,
    );
    expect(items(host)).toHaveLength(1);
  });

  it('drops children when items is set without render-props', async () => {
    const host = await render(
      <BsTimeline items={ITEMS}>
        <BsTimelineItem itemId="x" title="Manual" />
      </BsTimeline>,
    );
    expect(items(host)).toHaveLength(0);
  });

  it('lowers one item element per item when a render-prop is present', async () => {
    const host = await render(
      <BsTimeline items={ITEMS} renderTitle={(item) => <b>{item.title}</b>} />,
    );
    expect(items(host)).toHaveLength(3);
  });

  // Lowering mode must NOT also hand the element the array, or the element
  // renders its own rows underneath the lowered ones.
  it('does not also set the items property while lowering', async () => {
    const el = await renderEl<MpTimeline>(
      <BsTimeline items={ITEMS} renderTitle={(item) => <b>{item.title}</b>} />,
      'mp-timeline',
    );
    // The element's own default, i.e. nothing was pushed to it.
    expect(el.items ?? []).toEqual([]);
  });
});

describe('BsTimeline — lowering', () => {
  const slotted = (host: HTMLElement, slot: string) =>
    [...host.querySelectorAll('[slot="' + slot + '"]')];

  it('puts each render-prop output in its own slot', async () => {
    const host = await render(
      <BsTimeline
        items={ITEMS}
        renderMarker={() => <i>M</i>}
        renderTitle={(item) => <b>{item.title}</b>}
        renderContent={(item) => <p>{item.description}</p>}
      />,
    );
    expect(slotted(host, 'marker')).toHaveLength(3);
    expect(slotted(host, 'title')).toHaveLength(3);
    expect(slotted(host, 'content')).toHaveLength(3);
    expect(slotted(host, 'title')[1].textContent).toBe('Second');
  });

  // `renderTimestamp` and `renderOpposite` both target the `opposite` slot —
  // they are aliases, not two independent regions.
  it('routes both timestamp and opposite render-props to the opposite slot', async () => {
    const host = await render(
      <BsTimeline
        items={ITEMS}
        renderTimestamp={() => <span>ts</span>}
        renderOpposite={() => <span>op</span>}
      />,
    );
    expect(slotted(host, 'opposite')).toHaveLength(6);
  });

  it('copies the item fields onto the lowered element', async () => {
    const host = await render(
      <BsTimeline
        items={[
          {
            id: 'a',
            title: 'T',
            description: 'D',
            icon: 'star',
            color: 'red',
            cssClass: 'c',
            disabled: true,
          },
        ]}
        renderTitle={(item) => <b>{item.title}</b>}
      />,
    );
    const el = items(host)[0] as unknown as Record<string, unknown>;
    expect(el.title).toBe('T');
    expect(el.description).toBe('D');
    expect(el.icon).toBe('star');
    expect(el.color).toBe('red');
    expect(el.itemClass).toBe('c');
    expect(el.disabled).toBe(true);
  });

  // A Date cannot survive as a string field, so the wrapper formats it. Without
  // this the element receives the useless default Date stringification.
  it('formats a Date time to a locale date string', async () => {
    const time = new Date(2020, 0, 2);
    const host = await render(
      <BsTimeline items={[{ id: 'a', title: 'T', time }]} renderTitle={() => <b>t</b>} />,
    );
    expect((items(host)[0] as unknown as { time?: string }).time).toBe(time.toLocaleDateString());
  });

  it('passes a string time through unchanged', async () => {
    const host = await render(
      <BsTimeline
        items={[{ id: 'a', title: 'T', time: 'yesterday' }]}
        renderTitle={() => <b>t</b>}
      />,
    );
    expect((items(host)[0] as unknown as { time?: string }).time).toBe('yesterday');
  });
});

describe('BsTimeline — the render-prop context', () => {
  async function contexts(props: Record<string, unknown>) {
    const seen: TimelineItemContext[] = [];
    await render(
      <BsTimeline
        items={ITEMS}
        {...props}
        renderTitle={(_item, ctx) => {
          seen.push(ctx);
          return <b>t</b>;
        }}
      />,
    );
    return seen;
  }

  it('numbers the source index in array order', async () => {
    expect((await contexts({})).map((c) => c.index)).toEqual([0, 1, 2]);
  });

  // `reverse` flips the VISUAL order only; the source index must not move, or
  // a consumer indexing back into its own array reads the wrong row.
  it('mirrors the visual index under reverse while leaving the source index alone', async () => {
    const seen = await contexts({ reverse: true });
    expect(seen.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(seen.map((c) => c.visualIndex)).toEqual([2, 1, 0]);
  });

  it('marks first and last by visual position', async () => {
    const seen = await contexts({ reverse: true });
    expect(seen.map((c) => c.isFirst)).toEqual([false, false, true]);
    expect(seen.map((c) => c.isLast)).toEqual([true, false, false]);
  });

  it('carries the orientation through', async () => {
    const seen = await contexts({ orientation: 'horizontal' });
    expect(seen.every((c) => c.orientation === 'horizontal')).toBe(true);
  });

  it('alternates sides for align="alternate"', async () => {
    const seen = await contexts({ align: 'alternate' });
    expect(seen.map((c) => c.side)).toEqual(['start', 'end', 'start']);
  });

  it('puts every item on one side for align="end"', async () => {
    const seen = await contexts({ align: 'end' });
    expect(seen.map((c) => c.side)).toEqual(['end', 'end', 'end']);
  });
});

describe('BsTimeline — selection', () => {
  it('sends no selectedIds while selectable is none', async () => {
    const el = await renderEl<MpTimeline & { selectedIds?: unknown }>(
      <BsTimeline items={ITEMS} />,
      'mp-timeline',
    );
    expect(el.selectedIds ?? []).toEqual([]);
  });

  it('sends an empty selection when selectable is on but nothing is selected', async () => {
    const el = await renderEl<MpTimeline & { selectedIds?: unknown }>(
      <BsTimeline items={ITEMS} selectable="single" />,
      'mp-timeline',
    );
    expect(el.selectedIds).toEqual([]);
  });

  it('sends the ids of the controlled selection', async () => {
    const el = await renderEl<MpTimeline & { selectedIds?: unknown }>(
      <BsTimeline items={ITEMS} selectable="multiple" selection={[ITEMS[0], ITEMS[2]]} />,
      'mp-timeline',
    );
    expect(el.selectedIds).toEqual(['a', 'c']);
  });

  // The consumer gets back the objects it passed in, not the WC's copies —
  // that is what makes an identity check against the source array work in
  // application code.
  it('maps a selection-change back to the consumer own item objects', async () => {
    let received: TimelineItem[] | undefined;
    const el = await renderEl(
      <BsTimeline items={ITEMS} selectable="multiple" onSelectionChange={(s) => (received = s)} />,
      'mp-timeline',
    );

    await emit(el, 'selection-change', { selected: [{ id: 'b', title: 'a copy' }] });

    expect(received).toHaveLength(1);
    expect(received?.[0]).toBe(ITEMS[1]);
  });

  it('passes an unknown id through rather than dropping the row', async () => {
    let received: TimelineItem[] | undefined;
    const el = await renderEl(
      <BsTimeline items={ITEMS} selectable="multiple" onSelectionChange={(s) => (received = s)} />,
      'mp-timeline',
    );
    const stranger = { id: 'zz', title: 'Stranger' };

    await emit(el, 'selection-change', { selected: [stranger] });

    expect(received).toEqual([stranger]);
  });

  it('reports the detail as-is when there is no items array to map against', async () => {
    let received: TimelineItem[] | undefined;
    const el = await renderEl(
      <BsTimeline selectable="multiple" onSelectionChange={(s) => (received = s)}>
        <BsTimelineItem itemId="a" title="A" />
      </BsTimeline>,
      'mp-timeline',
    );
    const selected = [{ id: 'a', title: 'A' }];

    await emit(el, 'selection-change', { selected });

    expect(received).toEqual(selected);
  });

  it('unwraps item-click to its detail', async () => {
    let received: unknown;
    const el = await renderEl(
      <BsTimeline items={ITEMS} onItemClick={(d) => (received = d)} />,
      'mp-timeline',
    );

    await emit(el, 'item-click', { item: ITEMS[0], index: 0 });

    expect(received).toEqual({ item: ITEMS[0], index: 0 });
  });

  it('survives an event with no handler bound', async () => {
    const el = await renderEl(<BsTimeline items={ITEMS} />, 'mp-timeline');
    await expect(emit(el, 'item-click', { item: ITEMS[0], index: 0 })).resolves.toBeUndefined();
  });
});

describe('BsTimeline — layout props', () => {
  it('applies the documented defaults', async () => {
    const el = await renderEl<MpTimeline>(<BsTimeline />, 'mp-timeline');
    expect(el.orientation).toBe('vertical');
    expect(el.align).toBe('start');
  });

  it('forwards an explicit orientation and align', async () => {
    const el = await renderEl<MpTimeline>(
      <BsTimeline orientation="horizontal" align="alternate" />,
      'mp-timeline',
    );
    expect(el.orientation).toBe('horizontal');
    expect(el.align).toBe('alternate');
  });

  it('forwards className to the element', async () => {
    const el = await renderEl(<BsTimeline className="mine" />, 'mp-timeline');
    expect(el.classList.contains('mine')).toBe(true);
  });
});
