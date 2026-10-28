import * as React from 'react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { BsTimeline, BsTimelineItem } from '@mintplayer/react-bootstrap/timeline';
import type { TimelineItem, TimelineItemContext, TimelineSelectionChangeDetail } from '@mintplayer/ui-core/timeline';

import { render } from './harness';

/**
 * `BsTimeline` is generated from @mintplayer/ui-core/timeline (#437): it renders
 * its own rows, so what can go wrong in React is the binding — a scoped-slot
 * function that never receives its row, a controlled `selectedIds` the core
 * ignores, or a selection reported in keys the consumer never gave it.
 */

const ITEMS: TimelineItem[] = [
  { id: 'a', title: 'First', description: 'one' },
  { id: 'b', title: 'Second', description: 'two' },
  { id: 'c', title: 'Third', description: 'three' },
];

const rows = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('.timeline-item')];

describe('BsTimeline — rows', () => {
  it('renders one row per item with the title and description', async () => {
    const host = await render(<BsTimeline items={ITEMS} />);
    expect(rows(host)).toHaveLength(3);
    expect(rows(host)[1].querySelector('.timeline-heading')?.textContent).toBe('Second');
    expect(rows(host)[1].querySelector('.timeline-body')?.textContent).toBe('two');
  });

  it('renders declarative items when there are no data rows', async () => {
    const host = await render(
      <BsTimeline>
        <BsTimelineItem itemId="x" itemTitle="Manual" />
      </BsTimeline>,
    );
    expect(rows(host)).toHaveLength(1);
    expect(rows(host)[0].querySelector('.timeline-heading')?.textContent).toBe('Manual');
  });

  it('formats a Date time to a locale date string', async () => {
    const time = new Date(2020, 0, 2);
    const host = await render(<BsTimeline items={[{ id: 'a', title: 'T', time }]} />);
    expect(host.querySelector('.timeline-opposite')?.textContent).toBe(time.toLocaleDateString());
  });

  it('puts the layout on the root classes', async () => {
    const host = await render(<BsTimeline items={ITEMS} orientation="horizontal" align="alternate" reverse className="mine" />);
    const root = host.querySelector('.timeline')!;
    expect([...root.classList]).toEqual(expect.arrayContaining(['timeline-horizontal', 'timeline-align-alternate', 'timeline-reverse', 'mine']));
  });
});

describe('BsTimeline — scoped slots', () => {
  it('hands each slot function its row', async () => {
    const host = await render(<BsTimeline items={ITEMS} heading={({ item }) => <b>{item.title}!</b>} />);
    expect(rows(host).map((r) => r.querySelector('.timeline-heading b')?.textContent)).toEqual(['First!', 'Second!', 'Third!']);
  });

  it('prefers opposite over timestamp', async () => {
    const host = await render(<BsTimeline items={ITEMS} timestamp={() => <span>ts</span>} opposite={() => <span>op</span>} />);
    expect(rows(host).map((r) => r.querySelector('.timeline-opposite')?.textContent)).toEqual(['op', 'op', 'op']);
  });

  // reverse flips the VISUAL order only; the source index must not move.
  it('mirrors the visual index under reverse while leaving the source index alone', async () => {
    const seen: TimelineItemContext[] = [];
    await render(
      <BsTimeline
        items={ITEMS}
        reverse
        align="alternate"
        heading={({ ctx }) => {
          seen.push(ctx);
          return null;
        }}
      />,
    );
    const last = seen.slice(-3);
    expect(last.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(last.map((c) => c.visualIndex)).toEqual([2, 1, 0]);
    expect(last.map((c) => c.isLast)).toEqual([true, false, false]);
  });
});

describe('BsTimeline — selection', () => {
  it('is a list with no tab stops while selectable is none', async () => {
    const host = await render(<BsTimeline items={ITEMS} />);
    expect(host.querySelector('.timeline')?.getAttribute('role')).toBe('list');
    expect(rows(host).every((r) => r.getAttribute('role') === 'listitem' && !r.hasAttribute('tabindex'))).toBe(true);
  });

  it('marks the controlled selection', async () => {
    const host = await render(<BsTimeline items={ITEMS} selectable="multiple" selectedIds={['a', 'c']} />);
    expect(host.querySelector('.timeline')?.getAttribute('aria-multiselectable')).toBe('true');
    expect(rows(host).map((r) => r.getAttribute('aria-selected'))).toEqual(['true', 'false', 'true']);
  });

  it('reports a click as keys and as the consumer own item objects', async () => {
    const keys: (readonly string[])[] = [];
    const details: TimelineSelectionChangeDetail[] = [];
    const host = await render(
      <BsTimeline items={ITEMS} selectable="single" onSelectedIdsChange={(k) => keys.push(k)} onSelectionChange={(d) => details.push(d)} />,
    );
    await act(async () => rows(host)[1].click());
    expect(keys).toEqual([['b']]);
    expect(details[0].selected[0]).toBe(ITEMS[1]);
    expect(rows(host)[1].getAttribute('aria-selected')).toBe('true');
  });

  it('emits itemClick with the source index', async () => {
    const clicks: { item: TimelineItem; index: number }[] = [];
    const host = await render(<BsTimeline items={ITEMS} onItemClick={(d) => clicks.push(d)} />);
    await act(async () => rows(host)[2].click());
    expect(clicks.map((c) => [c.item, c.index])).toEqual([[ITEMS[2], 2]]);
  });
});
