import { afterEach } from 'vitest';
import '../src/components/mp-scheduler';
import type { MpScheduler } from '../src/components/mp-scheduler';
import type { SchedulerEvent } from '@mintplayer/ui-core/scheduler-core';
import { nextRaf, useFakeAnimationFrames } from './scheduler-spec-fixture';

/**
 * Shared fixture for the keyboard-matrix specs
 * (mp-scheduler.keyboard-matrix.spec.ts and mp-scheduler.keyboard-matrix-events.spec.ts).
 *
 * Fixture: Tuesday 12 May 2026 in en-US (weeks start on Sunday 10 May),
 * 30-minute slots, the focused cell at 09:00.
 *
 * The element under test is the module-level el, a live ESM binding that
 * mount() reassigns; each spec file gets its own copy of this module because
 * vitest isolates test files.
 */

type State = {
  focusedCell: { start: Date; end: Date } | null;
  focusedResourceId: string | null;
  focusedDate: Date | null;
  previewEvent: { start: Date; end: Date; resourceId?: string | null } | null;
  selectedEvent: SchedulerEvent | null;
  date: Date;
  view: string;
};

type Internals = {
  stateManager: { getState: () => State };
  dragManager: { isDragging: () => boolean; handlePointerDown: (...a: unknown[]) => void };
  updateComplete: Promise<void>;
};

export const internals = (el: MpScheduler) => el as unknown as Internals;
export const state = (el: MpScheduler) => internals(el).stateManager.getState();

export { nextRaf };

export async function settle(el: MpScheduler): Promise<void> {
  await internals(el).updateComplete;
  await nextRaf();
}

export let el: MpScheduler;

/** Registers the per-test hooks: fake animation frames, and removing the element. */
export function useMatrixFixture(): void {
  useFakeAnimationFrames();
  afterEach(() => el?.remove());
}

export async function mount(
  view: 'week' | 'day' | 'timeline' | 'month' | 'year',
  setup: (el: MpScheduler) => void = () => undefined,
): Promise<MpScheduler> {
  el = document.createElement('mp-scheduler') as MpScheduler;
  el.setAttribute('locale', 'en-US');
  document.body.appendChild(el);
  el.date = new Date(2026, 4, 12);
  setup(el);
  el.setAttribute('view', view);
  await settle(el);
  return el;
}

export function key(k: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(ev);
  return ev;
}

export const at = (day: number, h: number, m = 0) => new Date(2026, 4, day, h, m);
export const DENIED = 'That action is not allowed here.';
export const liveText = () => el.shadowRoot!.querySelector('[role="status"][aria-live]')?.textContent ?? '';

export type Mods = { shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean };
