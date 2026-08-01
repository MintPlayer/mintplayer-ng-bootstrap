import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(view: 'week' | 'day' | 'timeline' | 'month' | 'year' = 'week'): Promise<MpScheduler> {
  const el = document.createElement('mp-scheduler') as MpScheduler;
  document.body.appendChild(el);
  // Tuesday, May 12, 2026 — picked so the week ranges over a Mon-start week.
  (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
  if (view === 'timeline') {
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice', events: [] },
      { id: 'bob',   title: 'Bob',   events: [] },
    ];
  }
  el.setAttribute('view', view);
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return el;
}

function dispatchKey(el: MpScheduler, key: string, init: KeyboardEventInit = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
}

function getState(el: MpScheduler): {
  focusedCell: { start: Date; end: Date } | null;
  focusedDate: Date | null;
  selectionAnchor: { start: Date; end: Date } | null;
  selectionExtent: { start: Date; end: Date } | null;
  keyboardMoveEventId: string | null;
  previewEvent: { start: Date; end: Date } | null;
  events: { id: string; start: Date; end: Date }[];
  date: Date;
  view: string;
} {
  return (
    el as unknown as { stateManager: { getState: () => ReturnType<typeof getState> } }
  ).stateManager.getState();
}

function focusCell(el: MpScheduler, dayIndex: number, slotIndex: number): HTMLElement | null {
  const sel = `.scheduler-time-slot[data-day-index="${dayIndex}"][data-slot-index="${slotIndex}"]`;
  const cell = el.shadowRoot!.querySelector<HTMLElement>(sel);
  cell?.focus();
  return cell;
}

describe('mp-scheduler — cell ARIA + tab reachability', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('week-view cells are role=gridcell with aria-selected and a deterministic id', async () => {
    el = await mount('week');
    const cell = el.shadowRoot!.querySelector('.scheduler-time-slot') as HTMLElement;
    expect(cell.getAttribute('role')).toBe('gridcell');
    expect(cell.getAttribute('aria-selected')).toBe('false');
    expect(cell.id).toMatch(/^scheduler-cell-w-\d+-\d+$/);
  });

  it('grid is Tab-reachable: at least one cell has tabindex=0 even before any arrow press', async () => {
    el = await mount('week');
    const tabbable = el.shadowRoot!.querySelectorAll('.scheduler-time-slot[tabindex="0"]');
    expect(tabbable.length).toBeGreaterThanOrEqual(1);
  });
});

describe('mp-scheduler — arrow nav (week)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('ArrowDown advances focus by one slot in time', async () => {
    el = await mount('week');
    const before = focusCell(el, 1, 18); // Tue, slot 18 = 09:00 with 30-min slots
    expect(before).not.toBeNull();
    const beforeStart = new Date(before!.dataset['start']!);
    dispatchKey(el, 'ArrowDown');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const state = getState(el);
    expect(state.focusedCell).not.toBeNull();
    expect(state.focusedCell!.start.getTime()).toBe(beforeStart.getTime() + 30 * 60 * 1000);
  });

  it('ArrowRight advances focus by one day at the same time-of-day', async () => {
    el = await mount('week');
    const before = focusCell(el, 1, 18);
    expect(before).not.toBeNull();
    const beforeStart = new Date(before!.dataset['start']!);
    dispatchKey(el, 'ArrowRight');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const stateAfter = getState(el);
    expect(stateAfter.focusedCell!.start.getTime()).toBe(beforeStart.getTime() + 24 * 60 * 60 * 1000);
  });
});

describe('mp-scheduler — selection (Shift+arrow)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('Shift+ArrowDown extends a linear selection downward', async () => {
    el = await mount('week');
    focusCell(el, 1, 18);
    dispatchKey(el, 'ArrowDown'); // initialise focusedCell from active
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    dispatchKey(el, 'ArrowDown', { shiftKey: true });
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const state = getState(el);
    expect(state.selectionAnchor).not.toBeNull();
    expect(state.selectionExtent).not.toBeNull();
    // Anchor.start ≤ extent.start since we only moved forwards.
    expect(state.selectionAnchor!.start.getTime()).toBeLessThanOrEqual(state.selectionExtent!.start.getTime());
  });

  it('Escape clears the active selection', async () => {
    el = await mount('week');
    focusCell(el, 1, 18);
    dispatchKey(el, 'ArrowDown');
    dispatchKey(el, 'ArrowDown', { shiftKey: true });
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).selectionAnchor).not.toBeNull();
    dispatchKey(el, 'Escape');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).selectionAnchor).toBeNull();
    expect(getState(el).selectionExtent).toBeNull();
  });
});

describe('mp-scheduler — Enter on cell emits event-create *request*', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('Enter on a focused cell with no selection emits event-create with the cell range and view', async () => {
    el = await mount('week');
    focusCell(el, 1, 18);
    dispatchKey(el, 'ArrowDown'); // seed focusedCell
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const focusedBefore = getState(el).focusedCell!;
    let emitted: { range: { start: Date; end: Date }; view: string; resourceId?: string } | null = null;
    el.addEventListener('event-create', (ev) => {
      const detail = (ev as CustomEvent).detail;
      emitted = { range: detail.range, view: detail.view, resourceId: detail.resourceId };
    });
    const eventsBefore = getState(el).events.length;

    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    expect(emitted).not.toBeNull();
    expect(emitted!.range.start.getTime()).toBe(focusedBefore.start.getTime());
    expect(emitted!.range.end.getTime()).toBe(focusedBefore.end.getTime());
    expect(emitted!.view).toBe('week');
    // Per PRD scheduler-controlled-selection: the WC must NOT mutate its
    // internal events list — that's the consumer's job.
    expect(getState(el).events.length).toBe(eventsBefore);
  });

  it('Enter does not auto-clear the selection — consumer decides when to clear', async () => {
    el = await mount('week');
    focusCell(el, 1, 18);
    dispatchKey(el, 'ArrowDown');
    dispatchKey(el, 'ArrowDown', { shiftKey: true });
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).selectionAnchor).not.toBeNull();

    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    // Selection persists — the demo's `onEventCreate` handler is what calls
    // clearSelection() if it wants the post-commit clear behaviour.
    expect(getState(el).selectionAnchor).not.toBeNull();
  });
});

describe('mp-scheduler — event-selected rename + Tab parity', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('focus on an event emits `event-selected` and `selection-change`', async () => {
    el = await mount('week');
    // Inject an event into the week.
    const ev = {
      id: 'lunch',
      title: 'Lunch',
      start: new Date(2026, 4, 12, 12, 0),
      end: new Date(2026, 4, 12, 13, 0),
      color: '#00f',
    };
    (el as unknown as { events: unknown[] }).events = [ev];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const eventEl = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event');
    expect(eventEl).not.toBeNull();
    expect(eventEl!.getAttribute('tabindex')).toBe('0');

    let selectedFired = false;
    let selectionChangeFired = false;
    el.addEventListener('event-selected', () => { selectedFired = true; });
    el.addEventListener('selection-change', () => { selectionChangeFired = true; });

    eventEl!.focus();
    await nextRaf();
    expect(selectedFired).toBe(true);
    expect(selectionChangeFired).toBe(true);
  });
});

describe('mp-scheduler — move-mode (Enter + arrows)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('Enter on focused event enters move-mode (keyboardMoveEventId set, aria-pressed)', async () => {
    el = await mount('week');
    const ev = {
      id: 'standup',
      title: 'Standup',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
      color: '#0a0',
    };
    (el as unknown as { events: unknown[] }).events = [ev];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    const eventEl = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!;
    eventEl.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).keyboardMoveEventId).toBe('standup');
    // The view's update is rAF-batched when previewEvent is set (see
    // mp-scheduler.scheduleDragUpdate); wait an extra frame so the
    // re-rendered event picks up aria-pressed.
    await nextRaf();
    const eventElAfter = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!;
    expect(eventElAfter.getAttribute('aria-pressed')).toBe('true');
  });

  it('M on focused event enters move-mode too (D4: M is the canonical key, Enter kept)', async () => {
    el = await mount('week');
    const ev = {
      id: 'standup',
      title: 'Standup',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
    };
    (el as unknown as { events: unknown[] }).events = [ev];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'm');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).keyboardMoveEventId).toBe('standup');
  });

  it('ArrowDown in move-mode pushes the previewEvent forward by one slot', async () => {
    el = await mount('week');
    const ev = {
      id: 'standup',
      title: 'Standup',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
    };
    (el as unknown as { events: unknown[] }).events = [ev];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    dispatchKey(el, 'ArrowDown');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const preview = getState(el).previewEvent;
    expect(preview).not.toBeNull();
    expect(preview!.start.getTime()).toBe(ev.start.getTime() + 30 * 60 * 1000);
  });

  it('Escape cancels move-mode without committing the original event', async () => {
    el = await mount('week');
    const ev = {
      id: 'standup',
      title: 'Standup',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
    };
    (el as unknown as { events: unknown[] }).events = [ev];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    dispatchKey(el, 'ArrowDown');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    dispatchKey(el, 'Escape');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).keyboardMoveEventId).toBeNull();
    expect(getState(el).previewEvent).toBeNull();
    // Event in state still has its original start/end.
    const live = getState(el).events.find((e) => e.id === 'standup')!;
    expect(live.start.getTime()).toBe(ev.start.getTime());
    expect(live.end.getTime()).toBe(ev.end.getTime());
  });

  it('Enter in move-mode commits an event-update with the new times', async () => {
    el = await mount('week');
    const ev = {
      id: 'standup',
      title: 'Standup',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
    };
    (el as unknown as { events: unknown[] }).events = [ev];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');     // enter move mode
    dispatchKey(el, 'ArrowDown'); // nudge +slot
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    let updated: { start: Date; end: Date } | null = null;
    el.addEventListener('event-update', (e) => {
      const d = (e as CustomEvent).detail;
      updated = { start: d.event.start, end: d.event.end };
    });
    dispatchKey(el, 'Enter');     // commit
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(updated).not.toBeNull();
    expect(updated!.start.getTime()).toBe(ev.start.getTime() + 30 * 60 * 1000);
    expect(updated!.end.getTime()).toBe(ev.end.getTime() + 30 * 60 * 1000);
  });

  it('Shift+ArrowDown in move-mode grows the end edge by one slot (D5)', async () => {
    el = await mount('week');
    const ev = {
      id: 'standup',
      title: 'Standup',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
    };
    (el as unknown as { events: unknown[] }).events = [ev];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    dispatchKey(el, 'ArrowDown', { shiftKey: true });
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const preview = getState(el).previewEvent!;
    expect(preview.start.getTime()).toBe(ev.start.getTime()); // start unchanged
    expect(preview.end.getTime()).toBe(ev.end.getTime() + 30 * 60 * 1000);
  });
});

describe('mp-scheduler — Alt+letter shortcuts (D2)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('Alt+T jumps to today', async () => {
    el = await mount('week');
    const beforeDate = getState(el).date;
    // Set date to something other than today first.
    (el as unknown as { date: Date }).date = new Date(2025, 0, 1);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).date.getTime()).not.toBe(beforeDate.getTime());
    dispatchKey(el, 't', { altKey: true });
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const stateDate = new Date(getState(el).date);
    stateDate.setHours(0, 0, 0, 0);
    expect(stateDate.getTime()).toBe(today.getTime());
  });

  it('bare T does NOT trigger the today shortcut (was removed in D2)', async () => {
    el = await mount('week');
    const before = new Date(2025, 0, 1);
    (el as unknown as { date: Date }).date = before;
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    dispatchKey(el, 't'); // no Alt
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    // Date should be unchanged.
    expect(getState(el).date.getTime()).toBe(before.getTime());
  });
});

/**
 * Helpers shared by Phase B tests — month/year cells aren't time slots so
 * they have their own focus-by-id helper.
 */
function focusMonthCell(el: MpScheduler, isoDate: string): HTMLElement | null {
  const cell = el.shadowRoot!.querySelector<HTMLElement>(
    `#scheduler-cell-m-${isoDate}`,
  );
  cell?.focus();
  return cell;
}
function focusYearCell(el: MpScheduler, yyyymm: string): HTMLElement | null {
  const card = el.shadowRoot!.querySelector<HTMLElement>(
    `#scheduler-cell-y-${yyyymm}`,
  );
  card?.focus();
  return card;
}

describe('mp-scheduler — Phase B: month-view arrow nav', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('renders day cells with role=gridcell + deterministic id', async () => {
    el = await mount('month');
    const cell = el.shadowRoot!.querySelector<HTMLElement>(
      '#scheduler-cell-m-2026-05-12',
    );
    expect(cell).not.toBeNull();
    expect(cell!.getAttribute('role')).toBe('gridcell');
    // Month cells carry NO aria-selected — writing it for focus position
    // misreported focus as selection (audit MAJOR, PRD scheduler-resize-glyphs FR-11).
    expect(cell!.getAttribute('aria-selected')).toBeNull();
    expect(cell!.classList.contains('scheduler-month-day')).toBe(true);
  });

  it('ArrowRight advances focusedDate by one day', async () => {
    el = await mount('month');
    focusMonthCell(el, '2026-05-12');
    dispatchKey(el, 'ArrowRight');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const focused = getState(el).focusedDate!;
    expect(focused.getDate()).toBe(13);
    expect(focused.getMonth()).toBe(4);
  });

  it('ArrowDown advances focusedDate by one week', async () => {
    el = await mount('month');
    focusMonthCell(el, '2026-05-12');
    dispatchKey(el, 'ArrowDown');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const focused = getState(el).focusedDate!;
    expect(focused.getDate()).toBe(19); // 12 + 7
  });

  it('ArrowRight at month boundary auto-advances the displayed month (APG date-picker)', async () => {
    el = await mount('month');
    // Focus on May 31, 2026.
    focusMonthCell(el, '2026-05-31');
    dispatchKey(el, 'ArrowRight');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const state = getState(el);
    expect(state.focusedDate!.getMonth()).toBe(5); // June
    expect(state.focusedDate!.getDate()).toBe(1);
    expect(state.date.getMonth()).toBe(5); // displayed month flipped to June
  });

  it('Enter on a focused day fires event-create with the day-long range', async () => {
    el = await mount('month');
    focusMonthCell(el, '2026-05-12');
    dispatchKey(el, 'ArrowRight'); // seed focusedDate
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    let emitted: { range: { start: Date; end: Date }; view: string } | null = null;
    el.addEventListener('event-create', (ev) => {
      const d = (ev as CustomEvent).detail;
      emitted = { range: d.range, view: d.view };
    });
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(emitted).not.toBeNull();
    expect(emitted!.view).toBe('month');
    // 2026-05-13 (after the ArrowRight) → start at 00:00, end at next day 00:00.
    expect(emitted!.range.start.getDate()).toBe(13);
    expect(emitted!.range.start.getHours()).toBe(0);
    expect(emitted!.range.end.getDate()).toBe(14);
  });
});

describe('mp-scheduler — Phase B: year-view arrow nav', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('renders month cards with role=gridcell + deterministic id', async () => {
    el = await mount('year');
    const card = el.shadowRoot!.querySelector<HTMLElement>(
      '#scheduler-cell-y-2026-05',
    );
    expect(card).not.toBeNull();
    expect(card!.getAttribute('role')).toBe('gridcell');
    expect(card!.classList.contains('scheduler-year-month')).toBe(true);
  });

  it('ArrowRight advances focusedDate by one month', async () => {
    el = await mount('year');
    focusYearCell(el, '2026-05');
    dispatchKey(el, 'ArrowRight');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).focusedDate!.getMonth()).toBe(5); // June
  });

  it('ArrowDown advances focusedDate by three months (visual grid step)', async () => {
    el = await mount('year');
    focusYearCell(el, '2026-05');
    dispatchKey(el, 'ArrowDown');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).focusedDate!.getMonth()).toBe(7); // August
  });

  it('ArrowRight from December auto-advances to next year', async () => {
    el = await mount('year');
    focusYearCell(el, '2026-12');
    dispatchKey(el, 'ArrowRight');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const state = getState(el);
    expect(state.focusedDate!.getFullYear()).toBe(2027);
    expect(state.focusedDate!.getMonth()).toBe(0); // January
    expect(state.date.getFullYear()).toBe(2027);
  });

  // Changed deliberately (PRD scheduler-view-mode-completeness D8.8): Enter used
  // to emit a MONTH-SPANNING event-create from a year overview, which no consumer
  // could sensibly act on. It now drills into the month, matching what clicking
  // the month header already did.
  it('Enter on a focused month drills into that month instead of creating an event', async () => {
    el = await mount('year');
    focusYearCell(el, '2026-05');
    dispatchKey(el, 'ArrowRight'); // seed → June
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    let created = false;
    el.addEventListener('event-create', () => { created = true; });
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(created).toBe(false);
    const state = getState(el);
    expect(state.view).toBe('month');
    expect(state.date.getMonth()).toBe(5); // June
  });
});

describe('mp-scheduler — Phase B: inter-event arrow nav', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('ArrowRight on a focused event focuses the next event in start-time order', async () => {
    el = await mount('week');
    const events = [
      { id: 'a', title: 'A', start: new Date(2026, 4, 12, 10, 0), end: new Date(2026, 4, 12, 11, 0) },
      { id: 'b', title: 'B', start: new Date(2026, 4, 12, 13, 0), end: new Date(2026, 4, 12, 14, 0) },
      { id: 'c', title: 'C', start: new Date(2026, 4, 13, 9, 0),  end: new Date(2026, 4, 13, 10, 0) },
    ];
    (el as unknown as { events: unknown[] }).events = events;
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const evA = el.shadowRoot!.querySelector<HTMLElement>('[data-event-id="a"]')!;
    evA.focus();
    await nextRaf();
    dispatchKey(el, 'ArrowRight');
    await nextRaf();

    const active = el.shadowRoot!.activeElement as HTMLElement | null;
    expect(active?.getAttribute('data-event-id')).toBe('b');
  });

  it('ArrowLeft on the first event is a no-op (no wrap)', async () => {
    el = await mount('week');
    const events = [
      { id: 'a', title: 'A', start: new Date(2026, 4, 12, 10, 0), end: new Date(2026, 4, 12, 11, 0) },
      { id: 'b', title: 'B', start: new Date(2026, 4, 12, 13, 0), end: new Date(2026, 4, 12, 14, 0) },
    ];
    (el as unknown as { events: unknown[] }).events = events;
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const evA = el.shadowRoot!.querySelector<HTMLElement>('[data-event-id="a"]')!;
    evA.focus();
    await nextRaf();
    dispatchKey(el, 'ArrowLeft');
    await nextRaf();

    // Focus should stay on A (no wrap).
    const active = el.shadowRoot!.activeElement as HTMLElement | null;
    expect(active?.getAttribute('data-event-id')).toBe('a');
  });
});

/**
 * The drag/move ghost as a DOM element. The suite already covers
 * `state.previewEvent` (the model), which stayed correct throughout a bug
 * where the ghost was rendered invisibly or not at all — so assert the
 * element itself. jsdom can't judge stacking (no layout, and Lit's adopted
 * stylesheet isn't reachable via getComputedStyle), so paint order is covered
 * by apps/ng-bootstrap-demo-e2e/e2e/scheduler-resize.spec.ts instead; here we
 * pin the structural invariants that make stacking meaningful.
 */
describe('mp-scheduler — drag preview ghost (DOM)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('week: move-mode renders exactly one ghost, as a sibling and last child of the source', async () => {
    el = await mount('week');
    const ev = {
      id: 'standup',
      title: 'Standup',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
    };
    (el as unknown as { events: unknown[] }).events = [ev];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const ghosts = el.shadowRoot!.querySelectorAll('.scheduler-event.preview');
    expect(ghosts.length).toBe(1);
    const ghost = ghosts[0] as HTMLElement;
    const source = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-event:not(.preview)'),
    ).find((e) => e.dataset['eventId'] === 'standup')!;
    expect(source).toBeDefined();
    // z-index can only order siblings of one stacking context.
    expect(ghost.parentElement).toBe(source.parentElement);
    // The unselected case relies on this DOM-order tiebreak.
    expect(ghost.parentElement!.lastElementChild).toBe(ghost);
  });

  it('week: the ghost is removed from the DOM when move-mode is cancelled', async () => {
    el = await mount('week');
    (el as unknown as { events: unknown[] }).events = [
      { id: 'standup', title: 'Standup', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 9, 30) },
    ];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(el.shadowRoot!.querySelectorAll('.scheduler-event.preview').length).toBe(1);

    dispatchKey(el, 'Escape');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(el.shadowRoot!.querySelectorAll('.scheduler-event.preview').length).toBe(0);
  });

  it('timeline: move-mode renders a ghost too (it is gated on previewEvent, not dragState)', async () => {
    el = await mount('timeline');
    const ev = {
      id: 'review',
      title: 'Review',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 10, 0),
      resourceId: 'alice',
    };
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice', events: [ev] },
      { id: 'bob', title: 'Bob', events: [] },
    ];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-timeline-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // Regression: this was gated on `dragState`, which only the POINTER path
    // sets — so keyboard users got no ghost on the timeline at all.
    const ghosts = el.shadowRoot!.querySelectorAll('.scheduler-timeline-event.preview');
    expect(ghosts.length).toBe(1);
    const ghost = ghosts[0] as HTMLElement;
    const source = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-event:not(.preview)'),
    ).find((e) => e.dataset['eventId'] === 'review')!;
    expect(ghost.parentElement).toBe(source.parentElement);
    // Track-aligned with its source, not spanning the whole resource row.
    expect(ghost.style.top).toBe(source.style.top);
    expect(ghost.style.height).toBe(source.style.height);
  });
});

/**
 * Geometry regressions. These pin the two defects that silently mislocated or
 * mis-ranged real (committed) events, not just drag ghosts:
 *  - slotMinTime was ignored, so every box was offset by the hidden window;
 *  - the day's last slot was stamped with an `end` before its own `start`.
 */
describe('mp-scheduler — time-grid geometry', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('positions events relative to slotMinTime, not midnight', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { options: unknown }).options = {
      slotMinTime: '08:00:00',
      slotMaxTime: '18:00:00',
      slotDuration: 1800,
    };
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [
      {
        id: 'nine',
        title: 'Nine AM',
        start: new Date(2026, 4, 12, 9, 0),
        end: new Date(2026, 4, 12, 10, 0),
      },
    ];
    el.setAttribute('view', 'day');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box).toBeTruthy();
    // 09:00 is the 3rd row of an 08:00-start grid: 2 slots x 40px.
    // Measuring from midnight gave 720px (18 slots) — off by 640.
    expect(box.style.top).toBe('80px');
    expect(box.style.height).toBe('80px'); // one hour = 2 slots
  });

  it('stamps the last slot of the day with an end AFTER its start', async () => {
    el = await mount('week');
    const slots = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-time-slot'),
    );
    expect(slots.length).toBeGreaterThan(0);
    // Every slot must be a forward-going interval. The 23:30 row used to stamp
    // end = that day's 00:00, i.e. 23.5h before its own start.
    for (const slot of slots) {
      const start = new Date(slot.dataset['start']!).getTime();
      const end = new Date(slot.dataset['end']!).getTime();
      expect(end).toBeGreaterThan(start);
    }
  });
});

/**
 * The event model is normalized: one store, keyed by resourceId, merged from the
 * flat `events` input and any events authored under `resources`. Before this,
 * week/day/month/year read the flat list while timeline read `resource.events`,
 * so the two rendered disjoint sets from the same component.
 */
describe('mp-scheduler — normalized event/resource model', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const mountWith = async (props: Record<string, unknown>, view = 'timeline') => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    for (const [k, v] of Object.entries(props)) {
      (el as unknown as Record<string, unknown>)[k] = v;
    }
    el.setAttribute('view', view);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  it('shows a resource-less event in the timeline bucket row (the R2 report)', async () => {
    await mountWith({
      resources: [{ id: 'alice', title: 'Alice', events: [] }],
      // No resourceId — exactly what week view produces, since it has no
      // resource axis to supply one.
      events: [
        {
          id: 'from-week',
          title: 'Made in week view',
          start: new Date(2026, 4, 12, 9, 0),
          end: new Date(2026, 4, 12, 10, 0),
        },
      ],
    });

    const unassignedRow = el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned');
    expect(unassignedRow).not.toBeNull();
    expect(unassignedRow!.querySelector('.scheduler-resource-cell')!.textContent)
      .toContain('No resource');
    const chip = unassignedRow!.querySelector('.scheduler-timeline-event');
    expect(chip).not.toBeNull();
    expect(chip!.getAttribute('aria-label')).toContain('Made in week view');
  });

  it('no bucket row when every event has a resource', async () => {
    await mountWith({
      resources: [{ id: 'alice', title: 'Alice', events: [] }],
      events: [
        {
          id: 'assigned',
          title: 'Assigned',
          start: new Date(2026, 4, 12, 9, 0),
          end: new Date(2026, 4, 12, 10, 0),
          resourceId: 'alice',
        },
      ],
    });
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned')).toBeNull();
    // ...and it renders in Alice's row, from the flat input — timeline no longer
    // requires the event to be nested under the resource.
    const aliceRow = el.shadowRoot!.querySelector('.scheduler-timeline-row:not(.unassigned)')!;
    expect(aliceRow.querySelector('.scheduler-timeline-event')).not.toBeNull();
  });

  it('events authored under a resource are visible in week view too', async () => {
    await mountWith(
      {
        resources: [
          {
            id: 'alice',
            title: 'Alice',
            events: [
              {
                id: 'nested',
                title: 'Nested under Alice',
                start: new Date(2026, 4, 12, 9, 0),
                end: new Date(2026, 4, 12, 10, 0),
              },
            ],
          },
        ],
      },
      'week',
    );
    const box = el.shadowRoot!.querySelector('.scheduler-event:not(.preview)');
    expect(box).not.toBeNull();
    expect(box!.getAttribute('aria-label')).toContain('Nested under Alice');
  });

  it('stamps resourceId onto events authored under a resource', async () => {
    await mountWith({
      resources: [
        {
          id: 'alice',
          title: 'Alice',
          events: [
            {
              id: 'nested',
              title: 'Nested',
              start: new Date(2026, 4, 12, 9, 0),
              end: new Date(2026, 4, 12, 10, 0),
            },
          ],
        },
      ],
    });
    const state = getState(el) as unknown as {
      eventsByResource: Map<string | null, { id: string }[]>;
    };
    expect(state.eventsByResource.get('alice')!.map((e) => e.id)).toEqual(['nested']);
    expect(state.eventsByResource.get(null) ?? []).toEqual([]);
  });

  it('honours a group’s authored collapsed flag', async () => {
    await mountWith({
      resources: [
        {
          id: 'eng',
          title: 'Engineering',
          collapsed: true,
          children: [{ id: 'bob', title: 'Bob', events: [] }],
        },
      ],
    });
    // Bob's row must not be rendered while his parent group is collapsed.
    const headers = Array.from(
      el.shadowRoot!.querySelectorAll('.scheduler-resource-cell'),
    ).map((c) => c.textContent ?? '');
    expect(headers.some((h) => h.includes('Engineering'))).toBe(true);
    expect(headers.some((h) => h.includes('Bob'))).toBe(false);
  });
});

/**
 * Resource colour applies in EVERY view, not just timeline. Resource.color and
 * Resource.eventColor had existed in the model read by nothing, and week/day/
 * month/year had no route from an event to its resource at all.
 *
 * The dynamically-added-event case is tested deliberately: it is exactly where
 * FullCalendar (#5743), Bryntum (#4005) and DevExpress (T864922) each regressed.
 */
describe('mp-scheduler — resource colour across views', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const RESOURCES = [
    { id: 'alice', title: 'Alice', eventColor: '#112233' },
    { id: 'bob', title: 'Bob', color: '#445566' },
  ];

  const mountColoured = async (view: string, events: unknown[]) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = RESOURCES;
    (el as unknown as { events: unknown[] }).events = events;
    el.setAttribute('view', view);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const at = (h: number) => new Date(2026, 4, 12, h, 0);

  it('week view inherits the resource eventColor', async () => {
    await mountColoured('week', [
      { id: 'a', title: 'A', start: at(9), end: at(10), resourceId: 'alice' },
    ]);
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box.style.backgroundColor).toBe('rgb(17, 34, 51)'); // #112233
  });

  it('falls back to Resource.color when eventColor is absent', async () => {
    await mountColoured('day', [
      { id: 'b', title: 'B', start: at(9), end: at(10), resourceId: 'bob' },
    ]);
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box.style.backgroundColor).toBe('rgb(68, 85, 102)'); // #445566
  });

  it('the event’s own colour still wins over its resource', async () => {
    await mountColoured('week', [
      {
        id: 'c',
        title: 'C',
        start: at(9),
        end: at(10),
        resourceId: 'alice',
        color: '#ff0000',
      },
    ]);
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('keeps the resource colour for an event added AFTER first render', async () => {
    await mountColoured('week', []);
    (el as unknown as { events: unknown[] }).events = [
      { id: 'late', title: 'Late', start: at(11), end: at(12), resourceId: 'alice' },
    ];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box).toBeTruthy();
    expect(box.style.backgroundColor).toBe('rgb(17, 34, 51)');
  });

  it('uses options.defaultEventColor when nothing else specifies one', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { options: unknown }).options = { defaultEventColor: '#00ff00' };
    (el as unknown as { events: unknown[] }).events = [
      { id: 'plain', title: 'Plain', start: at(9), end: at(10) },
    ];
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box.style.backgroundColor).toBe('rgb(0, 255, 0)');
  });
});

/**
 * Read-only / permissions. The old `editable: false` gated POINTER gestures only,
 * so every keyboard path (Enter=create, Delete=delete, M=move-mode with
 * Shift+Arrow resize) walked straight past it — the scheduler could not be made
 * read-only at all.
 */
describe('mp-scheduler — permissions', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EVENT = {
    id: 'ev',
    title: 'Event',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
  };

  const mountWithPerms = async (perms: unknown, attrs: Record<string, string> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    if (perms !== undefined) {
      (el as unknown as { options: unknown }).options = { permissions: perms };
    }
    (el as unknown as { events: unknown[] }).events = [EVENT];
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const focusEvent = async () => {
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!.focus();
    await nextRaf();
  };

  it('permissions:false blocks Delete', async () => {
    await mountWithPerms(false);
    const deletions: unknown[] = [];
    el.addEventListener('event-delete', (e) => deletions.push(e));
    await focusEvent();
    dispatchKey(el, 'Delete');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(deletions.length).toBe(0);
  });

  it('permissions:false blocks entering move mode', async () => {
    await mountWithPerms(false);
    await focusEvent();
    dispatchKey(el, 'M');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).keyboardMoveEventId).toBeNull();
  });

  it('readonly attribute blocks Delete too (reachable from plain HTML)', async () => {
    await mountWithPerms(undefined, { readonly: '' });
    const deletions: unknown[] = [];
    el.addEventListener('event-delete', (e) => deletions.push(e));
    await focusEvent();
    dispatchKey(el, 'Delete');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(deletions.length).toBe(0);
  });

  it('read-only still allows grid NAVIGATION — commands are gated, not movement', async () => {
    await mountWithPerms(false);
    // Exactly one tab stop, and arrows still move the focused cell: reading a
    // schedule by keyboard is a legitimate task.
    const tabbable = el.shadowRoot!.querySelectorAll('.scheduler-time-slot[tabindex="0"]');
    expect(tabbable.length).toBe(1);
    (tabbable[0] as HTMLElement).focus();
    await nextRaf();
    const before = getState(el).focusedCell?.start.getTime();
    dispatchKey(el, 'ArrowDown');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).focusedCell?.start.getTime()).not.toBe(before);
  });

  it('read-only shortens the keymap description instead of promising blocked gestures', async () => {
    await mountWithPerms(false);
    const eventDesc = el.shadowRoot!.getElementById('scheduler-kbd-event')!.textContent ?? '';
    expect(eventDesc).not.toContain('Delete removes');
    expect(eventDesc).toContain('move between events');
    const gridDesc = el.shadowRoot!.getElementById('scheduler-kbd-grid')!.textContent ?? '';
    expect(gridDesc).not.toContain('new event');
  });

  it('read-only renders no resize handles', async () => {
    await mountWithPerms(false);
    expect(el.shadowRoot!.querySelectorAll('.resize-handle').length).toBe(0);
  });

  it('granular: moveEvent false still permits resize handles', async () => {
    await mountWithPerms({ moveEvent: false });
    expect(el.shadowRoot!.querySelectorAll('.resize-handle').length).toBeGreaterThan(0);
  });

  it('honours event.resizable per-edge object form', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [
      { ...EVENT, resizable: { start: false, end: true } },
    ];
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    // Previously only the `=== false` boolean branch was checked, so per-edge
    // locking silently did nothing.
    expect(el.shadowRoot!.querySelectorAll('.resize-handle.top').length).toBe(0);
    expect(el.shadowRoot!.querySelectorAll('.resize-handle.bottom').length).toBe(1);
  });

  it('a granular deleteEvent:false blocks only deletion', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { options: unknown }).options = { permissions: { deleteEvent: false } };
    (el as unknown as { events: unknown[] }).events = [EVENT];
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    const deletions: unknown[] = [];
    el.addEventListener('event-delete', (e) => deletions.push(e));
    await focusEvent();
    dispatchKey(el, 'Delete');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(deletions.length).toBe(0);
  });
});

/**
 * M8 — timeline resource affordances. The whole point of these is that they are
 * OFF by default, so the first test is the one that matters most: an ordinary
 * scheduler must not sprout resource-editing UI.
 */
describe('mp-scheduler — timeline resource affordances', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const RESOURCES = [
    {
      id: 'team',
      title: 'Team',
      children: [{ id: 'alice', title: 'Alice', color: '#ff0000', events: [] }],
    },
  ];

  const mountTimeline = async (options: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = RESOURCES;
    (el as unknown as { options: unknown }).options = options;
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  it('renders no creation UI by default', async () => {
    await mountTimeline();
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-addbar')).toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.scheduler-resource-action').length).toBe(0);
    expect(el.shadowRoot!.querySelectorAll('.scheduler-resource-color').length).toBe(0);
  });

  it('createResource adds the add-bar and a per-group add button, named by its group', async () => {
    await mountTimeline({ permissions: { createResource: true } });
    const bar = el.shadowRoot!.querySelector('.scheduler-timeline-addbar');
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute('role')).toBe('toolbar');
    const perGroup = el.shadowRoot!.querySelectorAll<HTMLElement>(
      '.scheduler-resource-action[data-action="add-resource"]',
    );
    expect(perGroup.length).toBe(1);
    // Disambiguated: N buttons all called "Add" is the failure mode this guards.
    expect(perGroup[0].getAttribute('aria-label')).toBe('Add resource to Team');
    // The glyph must not be part of the accessible name.
    expect(perGroup[0].querySelector('.action-glyph')!.getAttribute('aria-hidden')).toBe('true');
    // createGroup is a separate capability and stays off.
    expect(el.shadowRoot!.querySelectorAll('[data-action="add-group"]').length).toBe(0);
  });

  it('add-bar buttons emit resource-create / group-create with the parent id', async () => {
    await mountTimeline({ permissions: { createResource: true, createGroup: true } });
    const requests: { type: string; parentId?: string }[] = [];
    for (const type of ['resource-create', 'group-create']) {
      el.addEventListener(type, (e) =>
        requests.push({ type, parentId: (e as CustomEvent).detail.parentId }),
      );
    }
    el.shadowRoot!
      .querySelector<HTMLElement>('.scheduler-timeline-addbar [data-action="add-resource"]')!
      .click();
    el.shadowRoot!
      .querySelector<HTMLElement>('.scheduler-resource-action[data-action="add-group"]')!
      .click();
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(requests).toEqual([
      { type: 'resource-create', parentId: undefined },
      { type: 'group-create', parentId: 'team' },
    ]);
  });

  it('the colour swatch edits the field that actually drives the events', async () => {
    await mountTimeline({ permissions: { updateResource: true } });
    const swatch = el.shadowRoot!.querySelector<HTMLInputElement>(
      '.scheduler-resource-color[data-resource-id="alice"]',
    )!;
    // Seeded from the resource, and `color` because no eventColor is set.
    expect(swatch.value).toBe('#ff0000');
    expect(swatch.dataset['field']).toBe('color');
    let detail: { changes: Record<string, string> } | null = null;
    el.addEventListener('resource-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    swatch.value = '#00ff00';
    swatch.dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail).not.toBeNull();
    expect(detail!.changes).toEqual({ color: '#00ff00' });
  });

  it('a resource added after first paint appears without a date or view change', async () => {
    await mountTimeline();
    const before = el.shadowRoot!.querySelectorAll('.scheduler-timeline-row').length;
    (el as unknown as { resources: unknown[] }).resources = [
      ...RESOURCES,
      { id: 'bob', title: 'Bob', events: [] },
    ];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(el.shadowRoot!.querySelectorAll('.scheduler-timeline-row').length).toBe(before + 1);
  });

  it('read-only removes every resource affordance even when granted', async () => {
    await mountTimeline({ permissions: { createResource: true, deleteResource: true } });
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-addbar')).not.toBeNull();
    el.setAttribute('readonly', '');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-addbar')).toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.scheduler-resource-action').length).toBe(0);
  });
});

/** M10 — the month day popover. */
describe('mp-scheduler — month day popover', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EVENTS = [
    { id: 'a', title: 'Standup', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 9, 30) },
    { id: 'b', title: 'Lunch', start: new Date(2026, 4, 12, 12, 0), end: new Date(2026, 4, 12, 13, 0) },
    { id: 'c', title: 'Retro', start: new Date(2026, 4, 12, 15, 0), end: new Date(2026, 4, 12, 16, 0) },
    { id: 'd', title: 'Review', start: new Date(2026, 4, 12, 17, 0), end: new Date(2026, 4, 12, 18, 0) },
  ];

  const mountMonth = async (options: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = EVENTS;
    (el as unknown as { options: unknown }).options = options;
    el.setAttribute('view', 'month');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const popover = () => el.shadowRoot!.querySelector('.scheduler-day-popover');

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  it('the "+N more" link opens the popover instead of drilling into the day view', async () => {
    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    expect(popover()).not.toBeNull();
    expect(popover()!.getAttribute('role')).toBe('dialog');
    // Named by date, and listing every event on the day — not just the hidden ones.
    expect(popover()!.getAttribute('aria-label')).toContain('Events on');
    expect(popover()!.querySelectorAll('.popover-event').length).toBe(EVENTS.length);
    expect(getState(el).view).toBe('month');
  });

  it('moreLinkBehavior day keeps the old drill-down', async () => {
    await mountMonth({ moreLinkBehavior: 'day' });
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    expect(popover()).toBeNull();
    expect(getState(el).view).toBe('day');
  });

  // Phase 2 (D12.2c): the default flipped from 'none' to 'popover' — the click
  // surface is what the popover exists for. `date-click` still emits FIRST in
  // both modes, so a consumer's own handler is unaffected by the default.
  it('a plain cell click emits date-click and opens the popover by default; dayClickAction none opts out', async () => {
    await mountMonth();
    const clicks: Date[] = [];
    el.addEventListener('date-click', (e) => clicks.push((e as CustomEvent).detail.date));
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.click();
    await settle();
    expect(clicks.length).toBe(1);
    expect(popover()).not.toBeNull();
    el.remove();

    await mountMonth({ dayClickAction: 'none' });
    const optedOut: Date[] = [];
    el.addEventListener('date-click', (e) => optedOut.push((e as CustomEvent).detail.date));
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.click();
    await settle();
    expect(optedOut.length).toBe(1);
    expect(popover()).toBeNull();
  });

  it('clicking the day number drills into the day view', async () => {
    await mountMonth({ dayClickAction: 'popover' });
    el.shadowRoot!
      .querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14 .day-number')!
      .click();
    await settle();
    expect(popover()).toBeNull();
    expect(getState(el).view).toBe('day');
    expect(getState(el).date.getDate()).toBe(14);
  });

  it('Escape closes it; activating an entry emits event-selected and closes', async () => {
    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    // Focus lands on the first EVENT, not the close button in the header — a
    // dialog that opens focused on "close" dismisses itself on the first Enter.
    expect(el.shadowRoot!.activeElement?.classList.contains('popover-event')).toBe(true);
    dispatchKey(el, 'Escape');
    await settle();
    expect(popover()).toBeNull();

    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    let selected: string | null = null;
    el.addEventListener('event-selected', (e) => {
      selected = (e as CustomEvent).detail.event.id;
    });
    el.shadowRoot!.querySelectorAll<HTMLElement>('.popover-event')[1].click();
    await settle();
    expect(selected).toBe('b');
    expect(popover()).toBeNull();
  });

  it('New event requests the whole day, and is absent when creation is denied', async () => {
    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    let range: { start: Date; end: Date } | null = null;
    el.addEventListener('event-create', (e) => {
      range = (e as CustomEvent).detail.range;
    });
    el.shadowRoot!.querySelector<HTMLElement>('.popover-action.primary')!.click();
    await settle();
    expect(range).not.toBeNull();
    expect(range!.start.getHours()).toBe(0);
    expect(range!.end.getDate()).toBe(range!.start.getDate() + 1);
    el.remove();

    await mountMonth({ permissions: false });
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    expect(popover()).not.toBeNull();
    expect(popover()!.querySelector('.popover-action.primary')).toBeNull();
  });

  it('Space on a focused day cell opens the popover; Enter still requests an event', async () => {
    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.focus();
    await settle();
    dispatchKey(el, ' ');
    await settle();
    expect(popover()).not.toBeNull();
    el.remove();

    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.focus();
    await settle();
    let created = false;
    el.addEventListener('event-create', () => {
      created = true;
    });
    dispatchKey(el, 'Enter');
    await settle();
    expect(created).toBe(true);
  });
});

/**
 * M18 — the date popover reaches the year view (D12.2), anchored on the month
 * CARD: mini-days stay unfocusable by design, so the card is the only element
 * that can position the panel and receive focus back. Before this, a year
 * mini-day click leaked into the month-only anchor path and painted an
 * UNPOSITIONED fixed panel (B23).
 */
describe('mp-scheduler — year date surface (M18)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EVENTS = [
    { id: 'a', title: 'Kickoff', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 10, 0) },
    { id: 'b', title: 'Review', start: new Date(2026, 4, 20, 14, 0), end: new Date(2026, 4, 20, 15, 0) },
  ];

  const mountYear = async (options: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = EVENTS;
    (el as unknown as { options: unknown }).options = options;
    el.setAttribute('view', 'year');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const popover = () => el.shadowRoot!.querySelector('.scheduler-day-popover');
  const anchorEl = () => {
    const id = (el as unknown as { popoverAnchorId: string | null }).popoverAnchorId;
    return id ? el.shadowRoot!.getElementById(id) : null;
  };
  const miniDay = (cardKey: string, localDate: Date) =>
    [...el.shadowRoot!.querySelectorAll<HTMLElement>(
      `#scheduler-cell-y-${cardKey} .scheduler-mini-day[data-date]`,
    )].find((d) => {
      const parsed = new Date(d.dataset['date']!);
      return (
        parsed.getFullYear() === localDate.getFullYear() &&
        parsed.getMonth() === localDate.getMonth() &&
        parsed.getDate() === localDate.getDate()
      );
    }) ?? null;

  it('Space on a focused month card opens a MONTH-scoped popover grouped by day', async () => {
    await mountYear();
    focusYearCell(el, '2026-05');
    dispatchKey(el, ' ');
    await settle();
    expect(popover()).not.toBeNull();
    expect(popover()!.getAttribute('aria-label')).toContain('May 2026');
    // Two events on two different days → two day groups, each with one entry.
    expect(popover()!.querySelectorAll('.popover-day-label').length).toBe(2);
    expect(popover()!.querySelectorAll('.popover-event').length).toBe(2);
    // The anchor is the card itself — a real element, so the panel can position
    // and focus can return (the B23 failure mode was a null anchor).
    expect(anchorEl()).not.toBeNull();
    expect(anchorEl()!.id).toBe('scheduler-cell-y-2026-05');
    // "Show month" drills into the month.
    (popover()!.querySelector('.popover-action:not(.primary)') as HTMLElement).click();
    await settle();
    expect(getState(el).view).toBe('month');
    expect(getState(el).date.getMonth()).toBe(4);
  });

  it('clicking a mini-day opens the DAY-scoped popover anchored on its card', async () => {
    await mountYear();
    const day = miniDay('2026-05', new Date(2026, 4, 12));
    expect(day).not.toBeNull();
    const clicks: Date[] = [];
    el.addEventListener('date-click', (e) => clicks.push((e as CustomEvent).detail.date));
    day!.click();
    await settle();
    expect(clicks.length).toBe(1);
    expect(popover()).not.toBeNull();
    expect(popover()!.querySelectorAll('.popover-event').length).toBe(1);
    expect(anchorEl()).not.toBeNull();
    expect(anchorEl()!.id).toBe('scheduler-cell-y-2026-05');
  });

  it('an adjacent-month mini-day anchors on the card it was clicked in', async () => {
    await mountYear();
    // January's grid shows trailing December-of-last-year days, whose own month
    // key names a card that does not exist in this year's grid.
    const outOfYear = [...el.shadowRoot!.querySelectorAll<HTMLElement>(
      '#scheduler-cell-y-2026-01 .scheduler-mini-day.other-month[data-date]',
    )][0];
    expect(outOfYear).toBeDefined();
    outOfYear.click();
    await settle();
    expect(popover()).not.toBeNull();
    expect(anchorEl()).not.toBeNull();
    expect(anchorEl()!.id).toBe('scheduler-cell-y-2026-01');
  });

  it('dayClickAction none keeps a mini-day click date-click-only', async () => {
    await mountYear({ dayClickAction: 'none' });
    const day = miniDay('2026-05', new Date(2026, 4, 12));
    const clicks: Date[] = [];
    el.addEventListener('date-click', (e) => clicks.push((e as CustomEvent).detail.date));
    day!.click();
    await settle();
    expect(clicks.length).toBe(1);
    expect(popover()).toBeNull();
  });

  it('month cards carry their event count as text (WCAG 1.4.1 for .has-events)', async () => {
    await mountYear();
    const may = el.shadowRoot!.querySelector('#scheduler-cell-y-2026-05')!;
    expect(may.getAttribute('aria-label')).toContain('May 2026');
    expect(may.getAttribute('aria-label')).toContain('2 events');
    const june = el.shadowRoot!.querySelector('#scheduler-cell-y-2026-06')!;
    expect(june.getAttribute('aria-label')).toContain('0 events');
  });

  it('the create action carries the picked resource on event-create (D12.2d)', async () => {
    await mountYear();
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice' },
      { id: 'bob', title: 'Bob' },
    ];
    await settle();
    focusYearCell(el, '2026-05');
    dispatchKey(el, ' ');
    await settle();
    const picker = popover()!.querySelector<HTMLSelectElement>('.popover-resource-select')!;
    expect(picker).not.toBeNull();
    picker.value = 'bob';
    let detail: { resourceId?: string } | null = null;
    el.addEventListener('event-create', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (popover()!.querySelector('.popover-action.primary') as HTMLElement).click();
    await settle();
    expect(detail).not.toBeNull();
    expect(detail!.resourceId).toBe('bob');
  });
});

/**
 * M9 — every scheduler event must escape a nesting shadow root. Without
 * `composed`, a scheduler inside another component's shadow DOM is silent to the
 * outer consumer, which reads as "the wrapper dropped my handler".
 */
describe('mp-scheduler — events are composed', () => {
  it('a custom event crosses an enclosing shadow boundary', async () => {
    const outer = document.createElement('div');
    document.body.appendChild(outer);
    const root = outer.attachShadow({ mode: 'open' });
    const el = document.createElement('mp-scheduler') as MpScheduler;
    root.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    el.setAttribute('view', 'month');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    let heard = false;
    document.addEventListener('date-click', () => {
      heard = true;
    }, { once: true });
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.click();
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(heard).toBe(true);
    outer.remove();
  });
});

/**
 * Timeline tracks stack at a CONSTANT height and grow their row, rather than
 * dividing a fixed row between them.
 *
 * Week and day must divide: there height IS duration. The timeline's vertical
 * axis carries no information — time runs horizontally and the panel scrolls —
 * so two overlapping events used to render as two ~18px slivers of a 40px row.
 */
describe('mp-scheduler — timeline track stacking', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('overlapping events keep one height and stack, growing the resource row', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = [{ id: 'alice', title: 'Alice' }];
    (el as unknown as { events: unknown[] }).events = [
      { id: 'a', title: 'A', resourceId: 'alice', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 12, 0) },
      { id: 'b', title: 'B', resourceId: 'alice', start: new Date(2026, 4, 12, 10, 0), end: new Date(2026, 4, 12, 13, 0) },
      { id: 'c', title: 'C', resourceId: 'alice', start: new Date(2026, 4, 12, 11, 0), end: new Date(2026, 4, 12, 14, 0) },
    ];
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const boxes = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-event:not(.preview)'),
    );
    expect(boxes.length).toBe(3);

    // Every box the same height, expressed in px — a percentage of the row is
    // exactly what produced the slivers.
    const heights = boxes.map((b) => b.style.height);
    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toMatch(/px$/);

    // Distinct, ascending track offsets.
    const tops = boxes.map((b) => Number.parseFloat(b.style.top)).sort((x, y) => x - y);
    expect(new Set(tops).size).toBe(3);
    expect(tops[1] - tops[0]).toBeCloseTo(tops[2] - tops[1], 1);

    // The row grew past the 40px single-track baseline, and past three bands.
    const trackHeight = Number.parseFloat(heights[0]);
    const row = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-timeline-row')!;
    const rowHeight = Number.parseFloat(row.style.minHeight);
    expect(rowHeight).toBeGreaterThanOrEqual(3 * trackHeight);
    expect(rowHeight).toBeGreaterThan(40);
  });
});

/** D4.2's two remaining pieces: the strict-mode signal and the empty state. */
describe('mp-scheduler — resource-less events and an empty tree', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const mountTimeline = async (props: Record<string, unknown>) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    for (const [key, value] of Object.entries(props)) {
      (el as unknown as Record<string, unknown>)[key] = value;
    }
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const UNASSIGNED = {
    id: 'loose',
    title: 'Loose',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
  };

  it('requireEventResource warns once per event but never hides it', async () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));
    try {
      await mountTimeline({
        resources: [{ id: 'alice', title: 'Alice' }],
        events: [UNASSIGNED],
        options: { requireEventResource: true },
      });
      // Re-render a few times: the warning must not repeat per frame.
      (el as unknown as { date: Date }).date = new Date(2026, 4, 12, 1);
      await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
      await nextRaf();
    } finally {
      console.warn = original;
    }

    const relevant = warnings.filter((w) => w.includes('requireEventResource'));
    expect(relevant.length).toBe(1);
    expect(relevant[0]).toContain('loose');
    // Still rendered: the option is a signal, not a filter.
    expect(el.shadowRoot!.querySelectorAll('.scheduler-timeline-event').length).toBe(1);
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned')).not.toBeNull();
  });

  it('says so when there are no resources AND no events', async () => {
    await mountTimeline({ resources: [], events: [] });
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-empty')?.textContent).toBe(
      'No resources to show.',
    );
  });

  it('shows the bucket row instead of the empty state when events exist', async () => {
    await mountTimeline({ resources: [], events: [UNASSIGNED] });
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-empty')).toBeNull();
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned')).not.toBeNull();
  });

  // B29 — deleting a resource must not orphan its events invisibly: a dangling
  // resourceId sits under an index key no row reads, so before this fix the
  // event vanished from the timeline while week/day/month kept rendering it.
  it('events of a deleted resource re-bucket to "(No resource)" and warn once', async () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));
    try {
      await mountTimeline({
        resources: [
          { id: 'alice', title: 'Alice' },
          { id: 'bob', title: 'Bob' },
        ],
        events: [{ ...UNASSIGNED, id: 'orphan', resourceId: 'bob' }],
      });
      expect(el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned')).toBeNull();

      // The consumer honours resource-delete without touching the events.
      (el as unknown as { resources: unknown[] }).resources = [
        { id: 'alice', title: 'Alice' },
      ];
      await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
      await nextRaf();
    } finally {
      console.warn = original;
    }

    // Still visible — in the bucket row, not gone.
    const bucket = el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned');
    expect(bucket).not.toBeNull();
    expect(bucket!.querySelectorAll('.scheduler-timeline-event').length).toBe(1);
    // And reported once, naming the event and the dangling id.
    const relevant = warnings.filter((w) => w.includes('does not exist'));
    expect(relevant.length).toBe(1);
    expect(relevant[0]).toContain('orphan');
    expect(relevant[0]).toContain('bob');
  });
});

/**
 * The timeline resize/move ghost has to find its ROW, and a resize preview
 * carries no `resourceId` of its own — so the row can only come from the dragged
 * event. That lookup used to read `resource.events`, which stopped being a live
 * mirror when the model was normalized, so the ghost silently vanished for every
 * event supplied through the `events` input (i.e. every event a drag-create or
 * an ordinary API call produces).
 */
describe('mp-scheduler — timeline drag ghost finds its row', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const START = new Date(2026, 4, 12, 9, 0);
  const END = new Date(2026, 4, 12, 10, 0);
  const LONGER_END = new Date(2026, 4, 12, 12, 0);

  const mountTimeline = async (events: unknown[]) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'group', title: 'Team', children: [{ id: 'alice', title: 'Alice' }] },
    ];
    (el as unknown as { events: unknown[] }).events = events;
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  /** Drive the state a pointer resize produces: a dragState + a preview. */
  const startResize = async (event: { id: string; start: Date; end: Date }) => {
    const manager = (
      el as unknown as { stateManager: { setState: (u: Record<string, unknown>) => void } }
    ).stateManager;
    manager.setState({
      dragState: {
        type: 'resize-end',
        event,
        startSlot: { start: event.start, end: event.end },
        currentSlot: { start: event.start, end: LONGER_END },
        // NOTE: no resourceId anywhere in here — that is the whole point.
        preview: { start: event.start, end: LONGER_END },
      },
      previewEvent: { start: event.start, end: LONGER_END },
    });
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  it('renders the ghost in the resource row for an event from the flat events input', async () => {
    const event = { id: 'flat', title: 'Flat', resourceId: 'alice', start: START, end: END };
    await mountTimeline([event]);
    await startResize(event);

    const ghosts = el.shadowRoot!.querySelectorAll('.scheduler-timeline-event.preview');
    expect(ghosts.length).toBe(1);
    // In Alice's row, not just anywhere in the grid.
    const row = ghosts[0].closest('.scheduler-timeline-row')!;
    expect(row.querySelector('.scheduler-resource-cell')!.textContent).toContain('Alice');
  });

  it('renders the ghost in the bucket row for a resource-less event', async () => {
    const event = { id: 'loose', title: 'Loose', start: START, end: END };
    await mountTimeline([event]);
    await startResize(event);

    const ghost = el.shadowRoot!.querySelector('.scheduler-timeline-event.preview');
    expect(ghost).not.toBeNull();
    // A resource-less event is legitimately in the bucket row and still gets a
    // ghost — the old code bailed out on the missing resource id.
    expect(ghost!.closest('.scheduler-timeline-row')!.classList.contains('unassigned')).toBe(true);
  });

  it('puts the ghost on the source event track, and last in DOM order', async () => {
    const event = { id: 'flat', title: 'Flat', resourceId: 'alice', start: START, end: END };
    await mountTimeline([event]);
    await startResize(event);

    const container = el.shadowRoot!.querySelector('.scheduler-timeline-events')!;
    const boxes = Array.from(container.children) as HTMLElement[];
    const ghost = boxes.find((b) => b.classList.contains('preview'))!;
    const source = boxes.find((b) => b.dataset['eventId'] === 'flat')!;
    // Same band as its source — a ghost spanning every track of a multi-track
    // row is what the top/height copy exists to prevent.
    expect(ghost.style.top).toBe(source.style.top);
    expect(ghost.style.height).toBe(source.style.height);
    // Siblings, ghost last: jsdom cannot judge paint order, so the browser test
    // owns "on top" and this pins the structure that makes it meaningful.
    expect(boxes[boxes.length - 1]).toBe(ghost);
  });
});

/**
 * M20 — keyboard move-mode reaches the bucket row (B25/B26), and the timeline
 * entry announcement stops promising a time nudge on the resource axis (B28).
 * `nudgeKeyboardMoveResource` had NO coverage at all before this suite.
 */
describe('mp-scheduler — timeline move-mode reaches the bucket (M20)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const ASSIGNED = {
    id: 'task',
    title: 'Task',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
    resourceId: 'bob',
  };
  // A second, unassigned event so the bucket row is rendered at all — the row
  // list only contains what the view draws.
  const LOOSE = {
    id: 'loose',
    title: 'Loose',
    start: new Date(2026, 4, 12, 11, 0),
    end: new Date(2026, 4, 12, 12, 0),
  };

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const mountTimeline = async (events: unknown[]) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice' },
      { id: 'bob', title: 'Bob' },
    ];
    (el as unknown as { events: unknown[] }).events = events;
    el.setAttribute('view', 'timeline');
    await settle();
    return el;
  };

  const enterMoveModeOn = async (id: string) => {
    const eventEl = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-event')]
      .find((n) => n.dataset['eventId'] === id)!;
    eventEl.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await settle();
  };

  it('ArrowUp walks the move preview to the previous resource row', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    await enterMoveModeOn('task');
    dispatchKey(el, 'ArrowUp');
    await settle();
    expect(getState(el).previewEvent?.resourceId).toBe('alice');
  });

  it('ArrowDown past the last resource lands in the bucket; Enter commits with resourceId ABSENT', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    await enterMoveModeOn('task');
    dispatchKey(el, 'ArrowDown');
    await settle();
    // Preview names the bucket explicitly (null), not "no row" (undefined).
    expect(getState(el).previewEvent?.resourceId).toBeNull();
    // And the ghost renders IN the bucket row, not back in bob's (B26).
    const bucketGhost = el.shadowRoot!.querySelector(
      '.scheduler-timeline-row.unassigned .scheduler-timeline-event.preview',
    );
    expect(bucketGhost).not.toBeNull();

    let detail: { event: { resourceId?: string } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    dispatchKey(el, 'Enter');
    await settle();
    expect(detail).not.toBeNull();
    // Absent — not the old resource kept by a truthiness spread (B26).
    expect('resourceId' in detail!.event).toBe(false);
  });

  it('Escape restores the original row after a resource nudge', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    await enterMoveModeOn('task');
    dispatchKey(el, 'ArrowDown');
    await settle();
    dispatchKey(el, 'Escape');
    await settle();
    const live = getState(el).events.find((e) => e.id === 'task') as { resourceId?: string };
    expect(live.resourceId).toBe('bob');
  });

  it('without a rendered bucket row, ArrowDown from the last resource is a no-move', async () => {
    await mountTimeline([ASSIGNED]);
    await enterMoveModeOn('task');
    dispatchKey(el, 'ArrowDown');
    await settle();
    expect(getState(el).previewEvent?.resourceId).toBe('bob');
  });

  it('the timeline entry announcement names the resource axis (B28)', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    await enterMoveModeOn('task');
    const live = el.shadowRoot!.querySelector('[role="status"]');
    expect(live?.textContent).toContain('Up and Down arrows change the resource');
  });

  it('plain cell navigation reaches the bucket row too (B25)', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    const bobSlot = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-timeline-slot[data-resource-id="bob"]',
    )!;
    bobSlot.focus();
    await nextRaf();
    dispatchKey(el, 'ArrowDown');
    await settle();
    const active = el.shadowRoot!.activeElement as HTMLElement | null;
    expect(active?.dataset['unassigned']).toBe('true');
  });
});

/**
 * M21 (B24) — the pointer path is gated per GESTURE. isEditable() is an OR of
 * four capabilities, so before this gate `moveEvent: false, createEvent: true`
 * still allowed a mouse move-drag that keyboard move-mode correctly refused.
 */
describe('mp-scheduler — per-gesture pointer permission gate (M21)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EV = {
    id: 'task',
    title: 'Task',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
  };

  const mountWeek = async (permissions: Record<string, unknown>) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [EV];
    (el as unknown as { options: unknown }).options = { permissions };
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  type Internals = {
    handlePointerDown: (
      pointer: { x: number; y: number; target: HTMLElement; originalEvent: Event },
      target: Record<string, unknown>,
    ) => void;
    dragManager: {
      isPending: () => boolean;
      cancel: () => void;
      setSlotResolver: (fn: () => unknown) => void;
    };
  };

  const pointerDown = (target: Record<string, unknown>) => {
    const internals = el as unknown as Internals;
    // jsdom has no shadowRoot.elementsFromPoint — stub the resolver the drag
    // manager consults on pointer-down. The GATE under test runs before it.
    internals.dragManager.setSlotResolver(() => ({
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
    }));
    const host = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-content')!;
    internals.handlePointerDown(
      { x: 100, y: 100, target: host, originalEvent: new MouseEvent('mousedown') },
      target,
    );
    const pending = internals.dragManager.isPending();
    internals.dragManager.cancel();
    return pending;
  };

  it('moveEvent:false refuses a move-drag but createEvent still allows drag-create', async () => {
    await mountWeek({ moveEvent: false, createEvent: true });
    expect(pointerDown({ type: 'event', event: EV })).toBe(false);
    expect(pointerDown({ type: 'slot' })).toBe(true);
  });

  it('each resize edge is gated by ITS capability', async () => {
    await mountWeek({ resizeEventStart: false, resizeEventEnd: true });
    expect(pointerDown({ type: 'resize-handle', event: EV, resizeHandle: 'start' })).toBe(false);
    expect(pointerDown({ type: 'resize-handle', event: EV, resizeHandle: 'end' })).toBe(true);
  });

  it('selectRange alone keeps slot drags possible when createEvent is off', async () => {
    await mountWeek({ createEvent: false, selectRange: true });
    expect(pointerDown({ type: 'slot' })).toBe(true);
  });
});

/**
 * M22 (R14) — event-delete gets its pointer face: a real delete button per
 * popover row, sibling of the event button (nesting inside it would be a
 * nested interactive — both are buttons).
 */
describe('mp-scheduler — popover delete buttons (M22)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EVENTS = [
    { id: 'a', title: 'Standup', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 9, 30) },
    { id: 'b', title: 'Lunch', start: new Date(2026, 4, 12, 12, 0), end: new Date(2026, 4, 12, 13, 0) },
    { id: 'c', title: 'Retro', start: new Date(2026, 4, 12, 15, 0), end: new Date(2026, 4, 12, 16, 0) },
  ];

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const mountMonthPopover = async (options: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = EVENTS;
    (el as unknown as { options: unknown }).options = options;
    el.setAttribute('view', 'month');
    await settle();
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-12')!.click();
    await settle();
    return el;
  };

  const popover = () => el.shadowRoot!.querySelector('.scheduler-day-popover');

  it('each row carries a named delete button; deleteEvent:false renders none', async () => {
    await mountMonthPopover();
    const buttons = popover()!.querySelectorAll('.popover-event-delete');
    expect(buttons.length).toBe(EVENTS.length);
    expect(buttons[1].getAttribute('aria-label')).toBe('Delete Lunch');
    el.remove();

    await mountMonthPopover({ permissions: { deleteEvent: false } });
    expect(popover()).not.toBeNull();
    expect(popover()!.querySelectorAll('.popover-event-delete').length).toBe(0);
  });

  it('clicking delete emits event-delete, keeps the popover open, and moves focus to the next row', async () => {
    await mountMonthPopover();
    let deleted: string | null = null;
    el.addEventListener('event-delete', (e) => {
      deleted = (e as CustomEvent).detail.event.id;
      // The consumer applies the removal — the WC owns no data.
      (el as unknown as { events: unknown[] }).events = EVENTS.filter(
        (ev) => ev.id !== deleted,
      );
    });
    const rows = popover()!.querySelectorAll<HTMLElement>('.popover-event-delete');
    rows[1].click(); // delete "Lunch"
    await settle();
    await nextRaf();

    expect(deleted).toBe('b');
    expect(popover()).not.toBeNull();
    // Two rows left, focus parked on the one that took the deleted row's place.
    const remaining = popover()!.querySelectorAll('.popover-event');
    expect(remaining.length).toBe(2);
    expect(el.shadowRoot!.activeElement?.getAttribute('aria-label')).toContain('Retro');
  });
});

/**
 * M23 (R20) — the built-in event editor: a popover anchored to the event,
 * emitting the SAME requests every other surface emits (Save = event-update,
 * Delete = event-delete). §8.4 non-goal 3 reversed by user decision.
 */
describe('mp-scheduler — built-in event editor (M23)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EV = {
    id: 'task',
    title: 'Task',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
  };

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const mountWeek = async (props: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [EV];
    for (const [key, value] of Object.entries(props)) {
      (el as unknown as Record<string, unknown>)[key] = value;
    }
    el.setAttribute('view', 'week');
    await settle();
    return el;
  };

  const editor = () => el.shadowRoot!.querySelector('.scheduler-event-editor');

  const openViaF2 = async () => {
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'F2');
    await settle();
  };

  it('F2 on the selected event opens the editor; Escape closes and returns focus', async () => {
    await mountWeek();
    await openViaF2();
    expect(editor()).not.toBeNull();
    expect(editor()!.getAttribute('role')).toBe('dialog');
    expect(editor()!.getAttribute('aria-label')).toBe('Edit Task');
    // Focus lands on the first enabled input, not a button.
    expect((el.shadowRoot!.activeElement as HTMLElement)?.classList.contains('editor-input')).toBe(true);
    dispatchKey(el, 'Escape');
    await settle();
    expect(editor()).toBeNull();
    expect(
      (el.shadowRoot!.activeElement as HTMLElement)?.classList.contains('scheduler-event'),
    ).toBe(true);
  });

  it('right-click on an event opens the editor and suppresses the native menu', async () => {
    await mountWeek();
    const eventEl = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!;
    const ctx = new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true });
    eventEl.dispatchEvent(ctx);
    await settle();
    expect(ctx.defaultPrevented).toBe(true);
    expect(editor()).not.toBeNull();
  });

  it('Save emits event-update carrying the edited fields', async () => {
    await mountWeek();
    await openViaF2();
    const title = editor()!.querySelector<HTMLInputElement>('.editor-title-input')!;
    title.value = 'Renamed';
    const end = editor()!.querySelector<HTMLInputElement>('.editor-end-input')!;
    end.value = '2026-05-12T11:30';
    let detail: { event: { title: string; end: Date }; oldEvent: { title: string } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(detail).not.toBeNull();
    expect(detail!.event.title).toBe('Renamed');
    expect(detail!.event.end.getHours()).toBe(11);
    expect(detail!.event.end.getMinutes()).toBe(30);
    expect(detail!.oldEvent.title).toBe('Task');
    expect(editor()).toBeNull();
  });

  it('an inverted range is refused with an inline error and no emit', async () => {
    await mountWeek();
    await openViaF2();
    const end = editor()!.querySelector<HTMLInputElement>('.editor-end-input')!;
    end.value = '2026-05-12T08:00'; // before the 09:00 start
    let emitted = false;
    el.addEventListener('event-update', () => {
      emitted = true;
    });
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(emitted).toBe(false);
    expect(editor()).not.toBeNull();
    expect(editor()!.querySelector('.editor-error')?.textContent).toContain('End must be after start');
  });

  it('the Delete button emits event-delete and closes', async () => {
    await mountWeek();
    await openViaF2();
    let deleted: string | null = null;
    el.addEventListener('event-delete', (e) => {
      deleted = (e as CustomEvent).detail.event.id;
    });
    (editor()!.querySelector('.editor-action.danger') as HTMLElement).click();
    await settle();
    expect(deleted).toBe('task');
    expect(editor()).toBeNull();
  });

  it('fields follow the permission table; a disabled field is never read back', async () => {
    await mountWeek({
      options: { permissions: { moveEvent: false, resizeEventStart: false, resizeEventEnd: false } },
    });
    await openViaF2();
    // Title stays editable (editEvent default true); time fields are locked.
    expect(editor()!.querySelector<HTMLInputElement>('.editor-title-input')!.disabled).toBe(false);
    expect(editor()!.querySelector<HTMLInputElement>('.editor-start-input')!.disabled).toBe(true);
    expect(editor()!.querySelector<HTMLInputElement>('.editor-end-input')!.disabled).toBe(true);
    // Even a forced value on a disabled input must not survive Save.
    const end = editor()!.querySelector<HTMLInputElement>('.editor-end-input')!;
    end.value = '2026-05-12T15:00';
    let detail: { event: { end: Date } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(detail).not.toBeNull();
    expect(detail!.event.end.getTime()).toBe(EV.end.getTime());
  });

  /**
   * Colour is two-state (`color` absent = inherit from the resource) and the
   * CHECKBOX owns which state, not the swatch's value. Reading the swatch
   * unconditionally used to convert every inheriting event into an explicitly
   * coloured one on the first Save — it is seeded with the RESOLVED colour, so
   * the conversion was invisible until the resource was recoloured or the event
   * was dragged to another row, where it kept the old colour.
   */
  it('Save on an inheriting event does not pin a colour; unchecking inherit does', async () => {
    await mountWeek({ resources: [{ id: 'alice', title: 'Alice', color: '#fd7e14' }] });
    (el as unknown as { events: unknown[] }).events = [{ ...EV, resourceId: 'alice' }];
    await settle();
    await openViaF2();

    // Inheriting: checked, and the swatch is disabled so there is no gesture
    // that can silently commit the inherited value.
    const inherit = () => editor()!.querySelector<HTMLInputElement>('.editor-inherit-input')!;
    const swatch = () => editor()!.querySelector<HTMLInputElement>('.editor-color-input')!;
    expect(inherit().checked).toBe(true);
    expect(swatch().disabled).toBe(true);
    // It still SHOWS what it inherits.
    expect(swatch().value).toBe('#fd7e14');

    let detail: { event: { color?: string } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(detail).not.toBeNull();
    expect('color' in detail!.event).toBe(false);

    // Unchecking enables the swatch and pins whatever it holds.
    await openViaF2();
    inherit().checked = false;
    inherit().dispatchEvent(new Event('change', { bubbles: true }));
    expect(swatch().disabled).toBe(false);
    swatch().value = '#123456';
    detail = null;
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(detail!.event.color).toBe('#123456');

    // And re-checking it on an explicitly-coloured event CLEARS the override —
    // the checkbox is the reset, which a colour input alone cannot express.
    await openViaF2();
    expect(inherit().checked).toBe(false);
    inherit().checked = true;
    inherit().dispatchEvent(new Event('change', { bubbles: true }));
    detail = null;
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect('color' in detail!.event).toBe(false);
  });

  it('eventEditor=false disables every opener while event-dblclick keeps firing', async () => {
    await mountWeek({ eventEditor: false });
    expect(el.getAttribute('event-editor')).toBe('false');
    await openViaF2();
    expect(editor()).toBeNull();
    // The dblclick contract survives for app-owned editors.
    let dbl = false;
    el.addEventListener('event-dblclick', () => {
      dbl = true;
    });
    const internals = el as unknown as {
      registerEventActivation: (ev: unknown, oe: Event) => void;
    };
    internals.registerEventActivation(EV, new MouseEvent('click'));
    internals.registerEventActivation(EV, new MouseEvent('click'));
    await settle();
    expect(dbl).toBe(true);
    expect(editor()).toBeNull();
  });

  it('readonly kills the editor wholesale', async () => {
    await mountWeek({ readonly: true });
    await openViaF2();
    expect(editor()).toBeNull();
  });
});

/**
 * M24 (R15–R17) — the resource column: resize separator, full-text tooltips,
 * inline rename. Real geometry belongs to the browser tests; these pin the
 * structure, gating and the request contract.
 */
describe('mp-scheduler — resource column resize + rename (M24)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const mountTimeline = async (props: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'team', title: 'A very long team name that ellipsises', children: [
        { id: 'alice', title: 'Alice' },
      ] },
    ];
    for (const [key, value] of Object.entries(props)) {
      (el as unknown as Record<string, unknown>)[key] = value;
    }
    el.setAttribute('view', 'timeline');
    await settle();
    return el;
  };

  it('renders a window-splitter separator that writes the column width variable', async () => {
    await mountTimeline();
    const resizer = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-column-resizer')!;
    expect(resizer).not.toBeNull();
    expect(resizer.getAttribute('role')).toBe('separator');
    expect(resizer.getAttribute('aria-orientation')).toBe('vertical');
    expect(resizer.getAttribute('aria-label')).toBe('Resize the resource column');
    expect(resizer.getAttribute('aria-valuenow')).not.toBeNull();

    resizer.focus();
    resizer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle();
    const container = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-content')!;
    const written = container.style.getPropertyValue('--scheduler-resource-column-width');
    // Clamped and guarded: a px value wrapped in the calc(100% - 50px) cap.
    expect(written).toContain('px');
    expect(written).toContain('calc(100% - 50px)');
  });

  it('every resource/group title carries its full text as a tooltip (R16)', async () => {
    await mountTimeline();
    const titles = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.resource-title')];
    expect(titles.length).toBeGreaterThanOrEqual(2);
    expect(titles.every((t) => t.title === t.textContent)).toBe(true);
  });

  it('double-click renames via a resource-update request; Escape cancels (R17)', async () => {
    await mountTimeline({ options: { permissions: { updateResource: true } } });
    const title = el.shadowRoot!.querySelector<HTMLElement>(
      '.resource-title[data-resource-id="alice"]',
    )!;
    expect(title).not.toBeNull();

    // Escape path first: no emit, original text restored.
    title.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
    let input = title.querySelector('input')!;
    expect(input).not.toBeNull();
    input.value = 'Bob';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(title.textContent).toBe('Alice');

    // Enter path: the request carries only the changed field.
    let detail: { resource: { id: string }; changes: { title?: string } } | null = null;
    el.addEventListener('resource-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    title.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
    input = title.querySelector('input')!;
    input.value = 'Alicia';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(detail).not.toBeNull();
    expect(detail!.resource.id).toBe('alice');
    expect(detail!.changes).toEqual({ title: 'Alicia' });
    expect(title.textContent).toBe('Alicia');
  });

  it('rename is absent without updateResource, and F2 on a timeline cell starts it with', async () => {
    await mountTimeline();
    // Default permissions: no data-resource-id handle at all.
    expect(
      el.shadowRoot!.querySelector('.resource-title[data-resource-id]'),
    ).toBeNull();
    el.remove();

    await mountTimeline({ options: { permissions: { updateResource: true } } });
    const slot = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-timeline-slot[data-resource-id="alice"]',
    )!;
    slot.focus();
    await nextRaf();
    dispatchKey(el, 'F2');
    await settle();
    const title = el.shadowRoot!.querySelector<HTMLElement>(
      '.resource-title[data-resource-id="alice"]',
    )!;
    expect(title.querySelector('input')).not.toBeNull();
    expect(el.shadowRoot!.activeElement?.classList.contains('rename-input')).toBe(true);
  });
});
