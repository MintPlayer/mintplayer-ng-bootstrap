import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';

/**
 * M19 — the timeline grid's row/column model, the group-row walk, the per-view
 * keymap and week view's drill-down (audit majors M2, M3, M4, M6, M9, M10).
 *
 * These assert the NUMBERS a screen reader reads out, which is exactly the part
 * that was fiction before: a rowcount that counted two header rows over a body
 * that started at 2, day headers claiming one column while spanning ~48, and no
 * colcount at all. Layout is untestable here (jsdom lays nothing out), but none
 * of this is layout — it is arithmetic, and arithmetic is worth pinning.
 *
 * Locale is pinned in every mount: the week start is derived from it, so the
 * column count and the day headers differ between a Monday-start and a
 * Sunday-start machine.
 */

const RESOURCES = [
  {
    id: 'team',
    title: 'Team',
    color: '#3788d8',
    children: [
      { id: 'alice', title: 'Alice', events: [] },
      { id: 'bob', title: 'Bob', events: [] },
    ],
  },
];

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(view = 'timeline', locale = 'en-US'): Promise<MpScheduler> {
  const el = document.createElement('mp-scheduler') as MpScheduler;
  document.body.appendChild(el);
  el.setAttribute('locale', locale);
  (el as unknown as { date: Date }).date = new Date(2026, 6, 27); // Mon 27 Jul 2026
  (el as unknown as { resources: unknown[] }).resources = RESOURCES;
  el.setAttribute('view', view);
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return el;
}

const grid = (el: MpScheduler) => el.shadowRoot!.querySelector('.scheduler-timeline')!;
const rows = (el: MpScheduler) => [...el.shadowRoot!.querySelectorAll('[role="row"]')];
const num = (el: Element | null, attr: string) => Number(el?.getAttribute(attr));

afterEach(() => {
  document.querySelectorAll('mp-scheduler').forEach((n) => n.remove());
});

describe('timeline grid — row indices agree with the row count (M2)', () => {
  it('numbers both header rows before the body starts', async () => {
    const el = await mount();
    const indexed = rows(el).map((r) => num(r, 'aria-rowindex'));

    // 1 = day labels, 2 = time labels, body from 3. The time-label row used to
    // carry no index at all, and the body started at 2 on top of it.
    expect(indexed.slice(0, 2)).toEqual([1, 2]);
    expect(indexed.every((n) => Number.isFinite(n))).toBe(true);
  });

  it('ends on exactly the row aria-rowcount promises', async () => {
    const el = await mount();
    const indexed = rows(el).map((r) => num(r, 'aria-rowindex'));

    // The count always included both headers; only the body disagreed with it.
    expect(Math.max(...indexed)).toBe(num(grid(el), 'aria-rowcount'));
  });

  it('assigns each row a distinct index', async () => {
    const el = await mount();
    const indexed = rows(el).map((r) => num(r, 'aria-rowindex'));

    expect(new Set(indexed).size).toBe(indexed.length);
  });
});

describe('timeline grid — the column model (M3, M4)', () => {
  it('declares a colcount covering the resource column plus every slot', async () => {
    const el = await mount();
    const slotHeaders = el.shadowRoot!.querySelectorAll(
      '.scheduler-timeline-slot-header:not(.day)',
    );

    // Without this the count is inferred from one row's cell count — 2 here —
    // so the whole timeline announced as a two-column grid.
    expect(num(grid(el), 'aria-colcount')).toBe(1 + slotHeaders.length);
  });

  it('spans each day header across the slots it actually covers', async () => {
    const el = await mount();
    const dayHeaders = [...el.shadowRoot!.querySelectorAll('.scheduler-timeline-slot-header.day')];
    const spans = dayHeaders.map((h) => num(h, 'aria-colspan'));

    expect(dayHeaders.length).toBe(7);
    // A day is many slots wide; claiming one is what put every column under the
    // wrong weekday.
    expect(spans.every((s) => s > 1)).toBe(true);
    expect(spans.reduce((a, b) => a + b, 0)).toBe(num(grid(el), 'aria-colcount') - 1);
  });

  it('starts each day header where the previous one ended', async () => {
    const el = await mount();
    const dayHeaders = [...el.shadowRoot!.querySelectorAll('.scheduler-timeline-slot-header.day')];

    const expected = dayHeaders.reduce<number[]>(
      (acc, h) => [...acc, acc[acc.length - 1] + num(h, 'aria-colspan')],
      [2],
    );
    expect(dayHeaders.map((h) => num(h, 'aria-colindex'))).toEqual(expected.slice(0, -1));
  });

  it('lines the body cells up with the time-label header above them', async () => {
    const el = await mount();
    const headerIndices = [
      ...el.shadowRoot!.querySelectorAll('.scheduler-timeline-slot-header:not(.day)'),
    ].map((h) => num(h, 'aria-colindex'));
    const firstRowIndices = [
      ...rows(el)[2].querySelectorAll('.scheduler-timeline-slot'),
    ].map((c) => num(c, 'aria-colindex'));

    // The whole point of the column model: a cell and the header above it must
    // agree, or association puts the cell under the wrong day.
    expect(firstRowIndices).toEqual(headerIndices);
  });

  it('puts every rowheader in column 1', async () => {
    const el = await mount();
    const headers = [...el.shadowRoot!.querySelectorAll('[role="rowheader"]')];

    expect(headers.length).toBeGreaterThan(0);
    expect(headers.every((h) => h.getAttribute('aria-colindex') === '1')).toBe(true);
  });

  it('claims the whole slot strip for the events overlay, not a column past it', async () => {
    const el = await mount();
    const overlay = el.shadowRoot!.querySelector('.scheduler-timeline-events')!;

    expect(num(overlay, 'aria-colindex')).toBe(2);
    expect(num(overlay, 'aria-colindex') + num(overlay, 'aria-colspan') - 1).toBe(
      num(grid(el), 'aria-colcount'),
    );
  });

  it('leaves no bare generic between a row and its cells (M3)', async () => {
    const el = await mount();
    const containers = [
      ...el.shadowRoot!.querySelectorAll(
        '.scheduler-timeline-slots-header, .scheduler-timeline-slots',
      ),
    ];

    // One of the three used to be roleless while its twins were `presentation`.
    expect(containers.length).toBeGreaterThan(2);
    expect(containers.every((c) => c.getAttribute('role') === 'presentation')).toBe(true);
  });

  it('gives the second corner cell the role its twin has', async () => {
    const el = await mount();
    const corners = [...el.shadowRoot!.querySelectorAll('.scheduler-resource-header')];

    expect(corners).toHaveLength(2);
    expect(corners.every((c) => c.getAttribute('role') === 'columnheader')).toBe(true);
  });
});

describe('timeline grid — group rows are navigable (M10)', () => {
  it('renders the group as a row with cells of its own', async () => {
    const el = await mount();
    const groupRow = el.shadowRoot!.querySelector('.scheduler-timeline-row.group')!;

    // This is why skipping it in the walk was wrong: it is a real row, and it
    // can hold the grid's only tab stop.
    expect(groupRow.getAttribute('role')).toBe('row');
    expect(groupRow.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
  });

  it('walks onto the group row instead of teleporting past it', async () => {
    const el = await mount();
    const cells = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-slot')];
    // First cell of the SECOND row (Alice) — one ArrowUp should reach the group.
    const alice = cells.find((c) => c.dataset['resourceId'] === 'alice')!;
    alice.focus();
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }),
    );
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const focused = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-timeline-slot[tabindex="0"]',
    );
    expect(focused?.dataset['resourceId']).toBe('team');
  });

  it('names the group row when focus lands on it', async () => {
    const el = await mount();
    const cell = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-slot')].find(
      (c) => c.dataset['resourceId'] === 'team',
    )!;

    // getAllResources returns leaves only, so the lookup used to yield null here
    // and the cell announced its time with no row name.
    expect(cell.getAttribute('aria-label')).toContain('Team');
  });
});

describe('the announced keymap describes the view on screen (M6)', () => {
  const keymap = (el: MpScheduler) =>
    el.shadowRoot!.getElementById('scheduler-kbd-grid')!.textContent ?? '';

  it('does not promise Enter creates an event in year view', async () => {
    const el = await mount('year');

    // It opens the focused month. The old global string said otherwise.
    expect(keymap(el)).toContain('open the focused month');
    expect(keymap(el)).not.toContain('new event');
  });

  it('documents Space in month and year — the only route to the popover', async () => {
    const month = await mount('month');
    expect(keymap(month)).toContain('Space');

    document.querySelectorAll('mp-scheduler').forEach((n) => n.remove());
    const year = await mount('year');
    expect(keymap(year)).toContain('Space');
  });

  it('follows a runtime view switch instead of freezing at first render', async () => {
    const el = await mount('week');
    const before = keymap(el);

    el.setAttribute('view', 'year');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // The template re-renders only on requestUpdate; without one this text
    // stayed at whatever view rendered first.
    expect(keymap(el)).not.toBe(before);
    expect(keymap(el)).toContain('open the focused month');
  });

  it('keeps the slot-grid wording for week, day and timeline', async () => {
    const el = await mount('week');
    expect(keymap(el)).toContain('extend the selection');
  });
});

describe('week view — the day number opens that day (M9)', () => {
  it('exposes it as a named button rather than bare text', async () => {
    const el = await mount('week');
    const dayNumber = el.shadowRoot!.querySelector('.scheduler-day-header .day-number')!;

    expect(dayNumber.getAttribute('role')).toBe('button');
    expect(dayNumber.getAttribute('tabindex')).toBe('0');
    // "27" alone says nothing about what activating it does.
    expect(dayNumber.getAttribute('aria-label')).toMatch(/^Open /);
  });

  it('drills into that day on Enter', async () => {
    const el = await mount('week');
    const dayNumber = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-day-header .day-number',
    )!;
    const target = dayNumber.dataset['date'];
    dayNumber.focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // Asserted on what rendered, not on the `view` attribute: an internal state
    // change does not reflect back to the host, so the attribute still reads
    // whatever the consumer last set.
    expect(el.shadowRoot!.querySelector('.scheduler-day-view')).not.toBeNull();
    expect(target).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not strand focus on <body> after drilling', async () => {
    const el = await mount('week');
    const dayNumber = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-day-header .day-number',
    )!;
    dayNumber.focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // Activating a drill-down destroys the element the user is standing on, by
    // definition — it rebuilds the view underneath them. Restoration used to be
    // a no-op whenever `focusedCell` was null, which it is for anyone who never
    // entered the grid. Same path as the more-link and the year month-header.
    expect(el.shadowRoot!.activeElement).not.toBeNull();
    expect(el.shadowRoot!.activeElement?.getAttribute('role')).toBe('gridcell');
  });

  it('carries a local date key, not a UTC one', async () => {
    const el = await mount('week');
    const keys = [
      ...el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-day-header .day-number'),
    ].map((n) => n.dataset['date']);

    // toISOString() would name the previous or next day for most of the world.
    // en-US starts on Sunday, so the week containing Mon 27 Jul opens on the 26th.
    expect(keys[0]).toBe('2026-07-26');
    expect(keys).toHaveLength(7);
  });

  it('leaves day view alone — there is nothing to drill into from it', async () => {
    const el = await mount('day');
    const dayNumber = el.shadowRoot!.querySelector('.scheduler-day-header .day-number')!;

    expect(dayNumber.hasAttribute('role')).toBe(false);
  });
});
