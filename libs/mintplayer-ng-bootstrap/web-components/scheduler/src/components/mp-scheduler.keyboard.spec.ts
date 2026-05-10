import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(view: 'week' | 'day' | 'timeline' = 'week'): Promise<MpScheduler> {
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
  selectionAnchor: { start: Date; end: Date } | null;
  selectionExtent: { start: Date; end: Date } | null;
  keyboardMoveEventId: string | null;
  previewEvent: { start: Date; end: Date } | null;
  events: { id: string; start: Date; end: Date }[];
  date: Date;
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

describe('mp-scheduler — Enter on cell creates an event', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('Enter on a focused cell with no selection emits event-create spanning that single cell', async () => {
    el = await mount('week');
    focusCell(el, 1, 18);
    dispatchKey(el, 'ArrowDown'); // seed focusedCell
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const focusedBefore = getState(el).focusedCell!;
    let emitted: { start: Date; end: Date } | null = null;
    el.addEventListener('event-create', (ev) => {
      const detail = (ev as CustomEvent).detail;
      emitted = { start: detail.event.start, end: detail.event.end };
    });
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(emitted).not.toBeNull();
    expect(emitted!.start.getTime()).toBe(focusedBefore.start.getTime());
    expect(emitted!.end.getTime()).toBe(focusedBefore.end.getTime());
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
