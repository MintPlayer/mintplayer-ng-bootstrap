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

  it('Enter on a focused month fires event-create with the month-long range', async () => {
    el = await mount('year');
    focusYearCell(el, '2026-05');
    dispatchKey(el, 'ArrowRight'); // seed → June
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    let emitted: { range: { start: Date; end: Date }; view: string } | null = null;
    el.addEventListener('event-create', (ev) => {
      const d = (ev as CustomEvent).detail;
      emitted = { range: d.range, view: d.view };
    });
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(emitted).not.toBeNull();
    expect(emitted!.view).toBe('year');
    expect(emitted!.range.start.getMonth()).toBe(5); // June
    expect(emitted!.range.start.getDate()).toBe(1);
    expect(emitted!.range.end.getMonth()).toBe(6); // July
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
 * Read-only / permissions. `editable: false` used to gate POINTER gestures only,
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

  it('legacy editable:false still works as an alias', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { options: unknown }).options = { editable: false };
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
