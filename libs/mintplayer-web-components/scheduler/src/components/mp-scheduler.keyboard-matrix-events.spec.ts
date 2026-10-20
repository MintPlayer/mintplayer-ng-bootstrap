import { describe, expect, it } from 'vitest';
import type { SchedulerEvent } from '@mintplayer/ui-core/scheduler-core';
import {
  internals,
  state,
  nextRaf,
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
 * The keyboard matrix, part two: every key the focused-event and move-mode
 * handlers dispatch on, per view. The grid half is
 * mp-scheduler.keyboard-matrix.spec.ts; the fixture is shared in
 * scheduler/testing/keyboard-matrix-fixture.ts.
 */
useMatrixFixture();

// ---------------------------------------------------------------------------
// Keys on a focused event
// ---------------------------------------------------------------------------

const EV: SchedulerEvent = { id: 'task', title: 'Task', start: at(12, 9), end: at(12, 10) };

async function focusEvent(selector = '.scheduler-event[data-event-id="task"]'): Promise<void> {
  el.shadowRoot!.querySelector<HTMLElement>(selector)!.focus();
  await nextRaf();
}

describe('keyboard matrix — a focused event', () => {
  it('Delete requests the deletion of the selected event', async () => {
    await mount('week', (e) => (e.events = [EV]));
    const deletes: CustomEvent<{ event: SchedulerEvent }>[] = [];
    el.addEventListener('event-delete', (e) => deletes.push(e as CustomEvent<{ event: SchedulerEvent }>));
    await focusEvent();
    key('Delete');
    expect(deletes).toHaveLength(1);
    expect(deletes[0].detail.event.id).toBe('task');
  });

  it('Escape hands focus back to the grid', async () => {
    await mount('week', (e) => (e.events = [EV]));
    await focusEvent();
    key('Escape');
    await nextRaf();
    expect(el.shadowRoot!.activeElement?.classList.contains('scheduler-time-slot')).toBe(true);
  });

  it('Escape cancels a pointer drag in progress, whatever has focus', async () => {
    await mount('week', (e) => (e.events = [EV]));
    // No slot under the pointer: the hit-test seam answers with nothing.
    (el as unknown as { elementsAt: () => Element[] }).elementsAt = () => [];
    internals(el).dragManager.handlePointerDown(
      { pointerId: 0, pointerType: 'mouse', clientX: 0, clientY: 0, originalEvent: new MouseEvent('mousedown'), target: el, isPrimary: true },
      { type: 'event', event: EV },
    );
    expect(internals(el).dragManager.isDragging()).toBe(true);
    key('Escape');
    expect(internals(el).dragManager.isDragging()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Move-mode
// ---------------------------------------------------------------------------

describe('keyboard matrix — week move-mode', () => {
  it.each<[string, Mods, Date, Date]>([
    ['ArrowUp', {}, at(12, 8, 30), at(12, 9, 30)],
    ['ArrowDown', {}, at(12, 9, 30), at(12, 10, 30)],
    ['ArrowUp', { shiftKey: true }, at(12, 9), at(12, 9, 30)],
    ['ArrowDown', { shiftKey: true }, at(12, 9), at(12, 10, 30)],
    ['ArrowUp', { shiftKey: true, altKey: true }, at(12, 8, 30), at(12, 10)],
    ['ArrowDown', { shiftKey: true, altKey: true }, at(12, 9, 30), at(12, 10)],
    ['ArrowLeft', {}, at(11, 9), at(11, 10)],
    ['ArrowRight', {}, at(13, 9), at(13, 10)],
    ['ArrowRight', { shiftKey: true }, at(12, 9), at(13, 10)],
    ['ArrowLeft', { shiftKey: true, altKey: true }, at(11, 9), at(12, 10)],
    // Would invert the event: refused, the working copy stays put.
    ['ArrowLeft', { shiftKey: true }, at(12, 9), at(12, 10)],
    ['ArrowRight', { shiftKey: true, altKey: true }, at(12, 9), at(12, 10)],
  ])('%s %o moves the working copy to %s - %s', async (k, mods, start, end) => {
    await mount('week', (e) => (e.events = [EV]));
    await focusEvent();
    key('Enter');
    key(k, mods);
    expect(state(el).previewEvent).toMatchObject({ start, end });
  });

  it('a pinned start edge refuses the start resize and says so', async () => {
    await mount('week', (e) => (e.events = [{ ...EV, resizable: { start: false, end: true } }]));
    await focusEvent();
    key('Enter');
    key('ArrowUp', { shiftKey: true, altKey: true });
    await settle(el);
    expect(state(el).previewEvent).toMatchObject({ start: at(12, 9), end: at(12, 10) });
    expect(liveText()).toBe(DENIED);
  });
});

describe('keyboard matrix — day move-mode', () => {
  it.each(['ArrowLeft', 'ArrowRight'])('%s has no day axis to move along', async (k) => {
    await mount('day', (e) => (e.events = [EV]));
    await focusEvent();
    key('Enter');
    expect(key(k).defaultPrevented).toBe(true);
    expect(state(el).previewEvent).toMatchObject({ start: at(12, 9), end: at(12, 10) });
  });
});

describe('keyboard matrix — timeline move-mode', () => {
  const RESOURCES = [
    { id: 'alice', title: 'Alice' },
    { id: 'bob', title: 'Bob' },
  ];
  const TASK = { ...EV, resourceId: 'alice' };
  const enterMove = async () => {
    await mount('timeline', (e) => {
      e.resources = RESOURCES;
      e.events = [TASK];
    });
    await focusEvent('.scheduler-timeline-event[data-event-id="task"]');
    key('Enter');
  };

  it.each<[string, Mods, Date, Date]>([
    ['ArrowLeft', {}, at(12, 8, 30), at(12, 9, 30)],
    ['ArrowRight', {}, at(12, 9, 30), at(12, 10, 30)],
    ['ArrowLeft', { shiftKey: true }, at(12, 9), at(12, 9, 30)],
    ['ArrowRight', { shiftKey: true }, at(12, 9), at(12, 10, 30)],
    ['ArrowLeft', { shiftKey: true, altKey: true }, at(12, 8, 30), at(12, 10)],
    ['ArrowRight', { shiftKey: true, altKey: true }, at(12, 9, 30), at(12, 10)],
    // Time runs horizontally here; a modified vertical arrow does nothing.
    ['ArrowDown', { shiftKey: true }, at(12, 9), at(12, 10)],
  ])('%s %o moves the working copy to %s - %s', async (k, mods, start, end) => {
    await enterMove();
    key(k, mods);
    expect(state(el).previewEvent).toMatchObject({ start, end });
  });

  it('ArrowDown carries the event to the next row, and Enter commits the reassignment', async () => {
    await enterMove();
    const updates: CustomEvent<{ event: SchedulerEvent }>[] = [];
    el.addEventListener('event-update', (e) => updates.push(e as CustomEvent<{ event: SchedulerEvent }>));
    key('ArrowDown');
    expect(state(el).previewEvent?.resourceId).toBe('bob');
    key('Enter');
    expect(updates).toHaveLength(1);
    expect(updates[0].detail.event.resourceId).toBe('bob');
  });

  it('ArrowUp on the first row stays on it', async () => {
    await enterMove();
    key('ArrowUp');
    expect(state(el).previewEvent?.resourceId ?? 'alice').toBe('alice');
  });
});
