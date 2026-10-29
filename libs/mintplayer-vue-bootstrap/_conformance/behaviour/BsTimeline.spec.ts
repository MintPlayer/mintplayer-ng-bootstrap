import { describe, expect, it } from 'vitest';
import { h, nextTick, toRaw } from 'vue';

import { BsTimeline, BsTimelineItem } from '../../timeline/src/generated';
import type { TimelineItem, TimelineItemContext, TimelineSelectionChangeDetail } from '@mintplayer/ui-core/timeline';

import { mountWrapper } from './harness';

/**
 * `BsTimeline` is generated from @mintplayer/ui-core/timeline (#437) and renders
 * its own rows. What can go wrong in Vue is the binding: a scoped slot that
 * never receives its row, a `v-model:selectedIds` that is not written back, or
 * a selection reported in keys the consumer never gave it.
 */

const ITEMS: TimelineItem[] = [
  { id: 'a', title: 'First', description: 'one' },
  { id: 'b', title: 'Second', description: 'two' },
  { id: 'c', title: 'Third', description: 'three' },
];

const rows = (root: Element) => [...root.querySelectorAll<HTMLElement>('.timeline-item')];

describe('BsTimeline — rows', () => {
  it('renders one row per item with the title and description', () => {
    const wrapper = mountWrapper(BsTimeline, { props: { items: ITEMS } });
    expect(rows(wrapper.element)).toHaveLength(3);
    expect(rows(wrapper.element)[1].querySelector('.timeline-heading')?.textContent).toBe('Second');
    expect(rows(wrapper.element)[1].querySelector('.timeline-body')?.textContent).toBe('two');
  });

  it('renders declarative items when there are no data rows', () => {
    const wrapper = mountWrapper(BsTimeline, {
      slots: { default: () => h(BsTimelineItem, { itemId: 'x', itemTitle: 'Manual' }) },
    });
    expect(rows(wrapper.element)).toHaveLength(1);
    expect(rows(wrapper.element)[0].querySelector('.timeline-heading')?.textContent).toBe('Manual');
  });
});

describe('BsTimeline — scoped slots', () => {
  it('hands each slot its row', () => {
    const wrapper = mountWrapper(BsTimeline, {
      props: { items: ITEMS },
      slots: { heading: ({ item }: { item: TimelineItem }) => h('b', `${item.title}!`) },
    });
    expect(rows(wrapper.element).map((r) => r.querySelector('.timeline-heading b')?.textContent)).toEqual([
      'First!',
      'Second!',
      'Third!',
    ]);
  });

  // reverse flips the VISUAL order only; the source index must not move.
  it('mirrors the visual index under reverse while leaving the source index alone', () => {
    const seen: TimelineItemContext[] = [];
    mountWrapper(BsTimeline, {
      props: { items: ITEMS, reverse: true },
      slots: {
        marker: ({ ctx }: { ctx: TimelineItemContext }) => {
          seen.push(ctx);
          return h('i');
        },
      },
    });
    const last = seen.slice(-3);
    expect(last.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(last.map((c) => c.visualIndex)).toEqual([2, 1, 0]);
  });

  // A slot that appears at runtime is picked up; slots are not reactive deps.
  it('picks up a scoped slot that appears after mount', async () => {
    const wrapper = mountWrapper({
      props: ['on'],
      render(this: { on: boolean }) {
        return h(BsTimeline, { items: ITEMS }, this.on ? { content: () => h('em', 'late') } : {});
      },
    }, { props: { on: false } });
    expect(wrapper.element.querySelector('.timeline-body em')).toBeNull();
    await wrapper.setProps({ on: true });
    expect(wrapper.element.querySelectorAll('.timeline-body em')).toHaveLength(3);
  });
});

describe('BsTimeline — selection', () => {
  it('marks the bound selection', () => {
    const wrapper = mountWrapper(BsTimeline, { props: { items: ITEMS, selectable: 'multiple', selectedIds: ['a', 'c'] } });
    expect(rows(wrapper.element).map((r) => r.getAttribute('aria-selected'))).toEqual(['true', 'false', 'true']);
  });

  it('writes a click back through v-model and reports the consumer own items', async () => {
    const wrapper = mountWrapper(BsTimeline, { props: { items: ITEMS, selectable: 'single' } });
    rows(wrapper.element)[1].click();
    await nextTick();
    expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['b']]);
    const [detail] = wrapper.emitted('selectionchanged')![0] as [TimelineSelectionChangeDetail];
    // test-utils hands props over through reactive(); the core returns that same object.
    expect(toRaw(detail.selected[0])).toBe(ITEMS[1]);
    expect(rows(wrapper.element)[1].getAttribute('aria-selected')).toBe('true');
  });
});
