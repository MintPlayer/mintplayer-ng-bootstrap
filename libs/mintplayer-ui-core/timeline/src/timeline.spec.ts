import { describe, expect, it } from 'vitest';
import { NO_TIMELINE, connectTimeline, connectTimelineItem, type TimelineOptions } from './timeline';

const base: TimelineOptions = {
  ...NO_TIMELINE,
  items: [{ id: 'a', title: 'A' }, { id: 'b', disabled: true }, { title: 'C', time: new Date(2020, 0, 2) }],
  orientation: 'vertical',
  align: 'start',
  reverse: false,
  label: null,
};

describe('connectTimeline', () => {
  it('keys data rows by id, else by source index', () => {
    expect(connectTimeline(base).rows!.map((r) => r.key)).toEqual(['a', 'b', '2']);
  });

  // Data rows are known on the server, so the SSR output already has its tab stop.
  it('puts the tab stop on the first enabled row of a roving timeline before it is live', () => {
    const view = connectTimeline({ ...base, selectable: 'single', activeKey: null });
    expect(view.rows!.map((r) => r.bag['tabindex'])).toEqual([0, -1, -1]);
    expect(view.rows!.map((r) => r.bag['aria-selected'])).toEqual(['false', 'false', 'false']);
  });

  it('moves an active key off a disabled row', () => {
    const view = connectTimeline({ ...base, activatable: true, activeKey: 'b' });
    expect(view.rows!.map((r) => r.bag['tabindex'])).toEqual([0, -1, -1]);
  });

  it('writes aria-orientation only on a listbox', () => {
    expect(connectTimeline({ ...base, orientation: 'horizontal' }).root['aria-orientation']).toBeNull();
    expect(connectTimeline({ ...base, orientation: 'horizontal', selectable: 'single' }).root['aria-orientation']).toBe('horizontal');
  });

  it('formats a Date time and reports the visual index under reverse', () => {
    const view = connectTimeline({ ...base, reverse: true });
    expect(view.rows![2].time).toBe(new Date(2020, 0, 2).toLocaleDateString());
    expect(view.rows!.map((r) => [r.ctx.index, r.ctx.visualIndex, r.ctx.isLast])).toEqual([
      [0, 2, true],
      [1, 1, false],
      [2, 0, false],
    ]);
  });

  it('renders the default slot when there are no rows', () => {
    expect(connectTimeline({ ...base, items: [] }).rows).toBeNull();
  });
});

describe('connectTimelineItem', () => {
  const item = { key: 'x', itemId: 'x', title: 'T', description: null, time: null, icon: 'bi bi-star', color: 'red', disabled: false };

  it('is a presentational listitem outside a timeline', () => {
    const view = connectTimelineItem(NO_TIMELINE, item);
    expect(view.root['role']).toBe('listitem');
    expect(view.root['tabindex']).toBeNull();
    expect(view.lineStyle).toEqual({ '--mp-tl-item-color': 'red' });
    expect(view.icon).toMatchObject({ class: 'bi bi-star', 'aria-hidden': 'true' });
  });

  it('takes role, selection and tab stop from the timeline context', () => {
    const view = connectTimelineItem({ selectable: 'multiple', activatable: false, selected: ['x'], activeKey: 'x' }, item);
    expect(view.root).toMatchObject({ role: 'option', 'aria-selected': 'true', tabindex: 0 });
    expect(String(view.root['class'])).toContain('timeline-item-selected');
  });
});
