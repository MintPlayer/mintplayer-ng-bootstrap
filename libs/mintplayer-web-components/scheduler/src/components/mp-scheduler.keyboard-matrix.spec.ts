import { describe, expect, it } from 'vitest';
import {
  state,
  settle,
  el,
  mount,
  key,
  at,
  DENIED,
  liveText,
  type Mods,
  useMatrixFixture,
} from '../../testing/keyboard-matrix-fixture';

/**
 * The keyboard matrix, as tables. mp-scheduler.keyboard.spec.ts pins the
 * individual contracts; this file walks every key x modifier x view the grid
 * handler dispatches on, so a key that silently stops doing its job in one
 * view shows up as one failing row. Keys on a focused event and in move-mode
 * live in mp-scheduler.keyboard-matrix-events.spec.ts (split so vitest runs
 * the two halves in parallel); the fixture is shared in
 * scheduler/testing/keyboard-matrix-fixture.ts.
 */
useMatrixFixture();


// ---------------------------------------------------------------------------
// Grid navigation
// ---------------------------------------------------------------------------

function focusWeekCell(dayIndex: number, slotIndex: number): void {
  el.shadowRoot!
    .querySelector<HTMLElement>(`.scheduler-time-slot[data-day-index="${dayIndex}"][data-slot-index="${slotIndex}"]`)!
    .focus();
}

describe('keyboard matrix — week grid', () => {
  it.each<[string, Mods, Date, Date]>([
    ['ArrowUp', {}, at(12, 8, 30), new Date(2026, 4, 12)],
    ['ArrowDown', {}, at(12, 9, 30), new Date(2026, 4, 12)],
    ['ArrowLeft', {}, at(11, 9), new Date(2026, 4, 12)],
    ['ArrowRight', {}, at(13, 9), new Date(2026, 4, 12)],
    ['Home', {}, at(12, 0), new Date(2026, 4, 12)],
    ['End', {}, at(12, 23, 30), new Date(2026, 4, 12)],
    ['Home', { ctrlKey: true }, at(10, 0), new Date(2026, 4, 12)],
    ['End', { ctrlKey: true }, at(16, 23, 30), new Date(2026, 4, 12)],
    ['PageDown', {}, at(19, 9), new Date(2026, 4, 19)],
    ['PageUp', {}, at(5, 9), new Date(2026, 4, 5)],
  ])('%s %o moves focus to %s', async (k, mods, expected, date) => {
    await mount('week');
    focusWeekCell(2, 18);
    const ev = key(k, mods);
    expect(ev.defaultPrevented).toBe(true);
    expect(state(el).focusedCell!.start).toEqual(expected);
    expect(state(el).date).toEqual(date);
  });

  it.each<[string, Mods, Date, Date]>([
    ['End', { shiftKey: true }, at(12, 9), at(13, 0)],
    ['Home', { shiftKey: true }, at(12, 0), at(12, 9, 30)],
    ['End', { shiftKey: true, ctrlKey: true }, at(12, 9), at(17, 0)],
    ['Home', { shiftKey: true, ctrlKey: true }, at(10, 0), at(12, 9, 30)],
    ['ArrowRight', { shiftKey: true }, at(12, 9), at(13, 9, 30)],
    ['ArrowLeft', { shiftKey: true }, at(11, 9), at(12, 9, 30)],
  ])('Shift+%s %o selects from the anchor to the new cell', async (k, mods, start, end) => {
    await mount('week');
    focusWeekCell(2, 18);
    key(k, mods);
    expect(el.selectedRange).toEqual({ start, end });
  });

  it('Enter is refused and announced when creating is not permitted', async () => {
    const creates: Event[] = [];
    await mount('week', (e) => (e.options = { permissions: { createEvent: false } }));
    el.addEventListener('event-create', (e) => creates.push(e));
    focusWeekCell(2, 18);
    key('Enter');
    await settle(el);
    expect(creates).toHaveLength(0);
    expect(liveText()).toBe(DENIED);
  });
});

describe('keyboard matrix — day grid', () => {
  const focusDayCell = (slotIndex: number) =>
    el.shadowRoot!.querySelector<HTMLElement>(`.scheduler-time-slot[data-slot-index="${slotIndex}"]`)!.focus();

  it.each<[string, Mods, Date]>([
    ['ArrowUp', {}, at(12, 8, 30)],
    ['ArrowDown', {}, at(12, 9, 30)],
    // No columns to cross in a single-day grid.
    ['ArrowLeft', {}, at(12, 9)],
    ['ArrowRight', {}, at(12, 9)],
    ['Home', { ctrlKey: true }, at(12, 0)],
    ['End', { ctrlKey: true }, at(12, 23, 30)],
    ['PageDown', {}, at(13, 9)],
    ['PageUp', {}, at(11, 9)],
  ])('%s %o moves focus to %s', async (k, mods, expected) => {
    await mount('day');
    focusDayCell(18);
    key(k, mods);
    expect(state(el).focusedCell!.start).toEqual(expected);
  });
});

describe('keyboard matrix — timeline grid', () => {
  const RESOURCES = [
    { id: 'alice', title: 'Alice' },
    { id: 'bob', title: 'Bob' },
  ];
  const focusTimelineCell = (resourceId: string, start: Date) =>
    Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>(`.scheduler-timeline-slot[data-resource-id="${resourceId}"]`),
    )
      .find((s) => new Date(s.dataset['start']!).getTime() === start.getTime())!
      .focus();

  it.each<[string, Mods, Date, string]>([
    ['ArrowDown', {}, at(12, 9), 'bob'],
    ['ArrowRight', {}, at(12, 9, 30), 'alice'],
    ['Home', { ctrlKey: true }, at(10, 0), 'alice'],
    ['End', { ctrlKey: true }, at(16, 23, 30), 'bob'],
    ['PageDown', {}, at(19, 9), 'alice'],
  ])('%s %o moves focus to %s on %s', async (k, mods, expected, resourceId) => {
    await mount('timeline', (e) => (e.resources = RESOURCES));
    focusTimelineCell('alice', at(12, 9));
    key(k, mods);
    expect(state(el).focusedCell!.start).toEqual(expected);
    expect(state(el).focusedResourceId).toBe(resourceId);
  });

  it('Shift+ArrowDown does not extend a selection across resources', async () => {
    await mount('timeline', (e) => (e.resources = RESOURCES));
    focusTimelineCell('alice', at(12, 9));
    key('ArrowDown', { shiftKey: true });
    expect(state(el).focusedResourceId).toBe('alice');
  });
});

// ---------------------------------------------------------------------------
// Month and year grids
// ---------------------------------------------------------------------------

describe('keyboard matrix — month grid', () => {
  it.each<[string, Date]>([
    ['ArrowLeft', new Date(2026, 4, 11)],
    ['ArrowRight', new Date(2026, 4, 13)],
    ['ArrowUp', new Date(2026, 4, 5)],
    ['ArrowDown', new Date(2026, 4, 19)],
    ['PageUp', new Date(2026, 3, 12)],
    ['PageDown', new Date(2026, 5, 12)],
  ])('%s moves the focused day to %s', async (k, expected) => {
    await mount('month');
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-12')!.focus();
    expect(key(k).defaultPrevented).toBe(true);
    expect(state(el).focusedDate).toEqual(expected);
  });

  it('Enter is refused and announced when creating is not permitted', async () => {
    const creates: Event[] = [];
    await mount('month', (e) => (e.options = { permissions: { createEvent: false } }));
    el.addEventListener('event-create', (e) => creates.push(e));
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-12')!.focus();
    key('Enter');
    await settle(el);
    expect(creates).toHaveLength(0);
    expect(liveText()).toBe(DENIED);
  });

  it('Enter on a focused "+N more" link drills into that day', async () => {
    const busy = Array.from({ length: 6 }, (_, i) => ({
      id: `e${i}`,
      title: `E${i}`,
      start: at(12, 8 + i),
      end: at(12, 8 + i, 30),
    }));
    await mount('month', (e) => {
      e.events = busy;
      e.options = { moreLinkBehavior: 'day' };
    });
    const more = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!;
    expect(more).not.toBeNull();
    more.focus();
    expect(key('Enter').defaultPrevented).toBe(true);
    expect(state(el).view).toBe('day');
    expect(state(el).date).toEqual(new Date(2026, 4, 12));
  });
});

describe('keyboard matrix — year grid', () => {
  it.each<[string, Date]>([
    ['ArrowLeft', new Date(2026, 3, 1)],
    ['ArrowRight', new Date(2026, 5, 1)],
    ['ArrowUp', new Date(2026, 1, 1)],
    ['ArrowDown', new Date(2026, 7, 1)],
    ['PageUp', new Date(2025, 4, 1)],
    ['PageDown', new Date(2027, 4, 1)],
  ])('%s moves the focused month to %s', async (k, expected) => {
    await mount('year');
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-y-2026-05')!.focus();
    expect(key(k).defaultPrevented).toBe(true);
    expect(state(el).focusedDate).toEqual(expected);
  });

  it('Enter on a focused month header drills into that month', async () => {
    await mount('year');
    const header = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-year-month-header'),
    ).find((h) => new Date(h.dataset['month']!).getMonth() === 7)!;
    header.focus();
    expect(key('Enter').defaultPrevented).toBe(true);
    expect(state(el).view).toBe('month');
    expect(state(el).date.getMonth()).toBe(7);
  });
});

describe('keyboard matrix — Alt shortcuts', () => {
  it.each([
    ['y', 'year'],
    ['m', 'month'],
    ['w', 'week'],
    ['d', 'day'],
  ])('Alt+%s switches to the %s view', async (letter, view) => {
    await mount(view === 'week' ? 'day' : 'week');
    expect(key(letter, { altKey: true }).defaultPrevented).toBe(true);
    expect(el.view).toBe(view);
  });

  it('Alt with another modifier is not a shortcut', async () => {
    await mount('week');
    key('m', { altKey: true, shiftKey: true });
    expect(el.view).toBe('week');
  });
});
