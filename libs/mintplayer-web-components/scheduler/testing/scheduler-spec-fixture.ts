import { afterEach, beforeEach, vi } from 'vitest';
import '../src/components/mp-scheduler';
import type { MpScheduler } from '../src/components/mp-scheduler';

/**
 * Shared fixture for the mp-scheduler keyboard / interaction specs.
 *
 * Lives outside src/ on purpose: tsconfig.lib.json, the dts build and the CEM
 * analyzer only look at src/, so this file (which imports vitest) never ships.
 *
 * Animation frames are FAKED. The scheduler defers focus moves, drag-preview
 * updates and scroll-into-view to requestAnimationFrame, and the specs flush
 * that work explicitly with nextRaf(). Under jsdom a real frame is a ~16 ms
 * wall-clock wait, so every mount plus every nextRaf() idled for two of them;
 * across ~200 tests that was over a quarter of the files' wall time. With fake
 * frames nextRaf() runs exactly the same callbacks, in the same order, without
 * the wait, and a frame can no longer fire "by accident" in the middle of a
 * long render, which makes the specs deterministic rather than less strict.
 */
export function useFakeAnimationFrames(): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
}

/** Flush two animation frames (the component sometimes chains rAF inside rAF). */
export async function nextRaf(): Promise<void> {
  vi.advanceTimersToNextFrame();
  vi.advanceTimersToNextFrame();
}

export async function mount(view: 'week' | 'day' | 'timeline' | 'month' | 'year' = 'week'): Promise<MpScheduler> {
  const el = document.createElement('mp-scheduler') as MpScheduler;
  document.body.appendChild(el);
  // Tuesday, May 12, 2026. The spec pins locale='en-US' below, which now also
  // pins the week start (Sunday) — the week no longer depends on a default.
  (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
  if (view === 'timeline') {
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice', events: [] },
      { id: 'bob',   title: 'Bob',   events: [] },
    ];
  }
  // Pin the locale. DEFAULT_OPTIONS.locale used to be the literal 'en-US', which
  // silently made every spec deterministic; it is now undefined so the component
  // follows the browser, and an unpinned spec would assert the MACHINE's locale
  // ("mei 2026" on this dev box, "May 2026" in a US CI). Tests that care about
  // localization set their own locale explicitly.
  el.setAttribute('locale', 'en-US');
  el.setAttribute('view', view);
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return el;
}

export function dispatchKey(el: MpScheduler, key: string, init: KeyboardEventInit = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
}

export function getState(el: MpScheduler): {
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

export function focusCell(el: MpScheduler, dayIndex: number, slotIndex: number): HTMLElement | null {
  const sel = `.scheduler-time-slot[data-day-index="${dayIndex}"][data-slot-index="${slotIndex}"]`;
  const cell = el.shadowRoot!.querySelector<HTMLElement>(sel);
  cell?.focus();
  return cell;
}

/**
 * Month/year cells aren't time slots so they have their own focus-by-id helper.
 */
export function focusMonthCell(el: MpScheduler, isoDate: string): HTMLElement | null {
  const cell = el.shadowRoot!.querySelector<HTMLElement>(
    `#scheduler-cell-m-${isoDate}`,
  );
  cell?.focus();
  return cell;
}

export function focusYearCell(el: MpScheduler, yyyymm: string): HTMLElement | null {
  const card = el.shadowRoot!.querySelector<HTMLElement>(
    `#scheduler-cell-y-${yyyymm}`,
  );
  card?.focus();
  return card;
}
