import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SchedulerEvent, TimeSlot } from '@mintplayer/web-components/scheduler-core';
import { SchedulerStateManager } from '../state/scheduler-state';
import { DragManager } from './drag-manager';
import type { NormalizedPointerEvent } from '../input/pointer-event';

/**
 * DragManager glues the pure state machine to the scheduler store and batches
 * pointer moves into one update per animation frame. The slot under the
 * pointer comes from the resolver seam (`setSlotResolver`), which answers a
 * hit-test from coordinates; no geometry is faked.
 */

const slotAt = (hour: number, minute = 0): TimeSlot => ({
  start: new Date(2026, 4, 12, hour, minute),
  end: new Date(2026, 4, 12, hour, minute + 30),
});

const EVENT: SchedulerEvent = {
  id: 'e1',
  title: 'Standup',
  start: new Date(2026, 4, 12, 9, 0),
  end: new Date(2026, 4, 12, 10, 0),
};

const pointer = (x: number, y: number): NormalizedPointerEvent => ({
  pointerId: 0,
  pointerType: 'mouse',
  clientX: x,
  clientY: y,
  originalEvent: new MouseEvent('mousemove'),
  target: document.body,
  isPrimary: true,
});

/** Resolver keyed on y: every 10px down is the next half hour from 09:00. */
const byY = (_x: number, y: number): TimeSlot | null =>
  y < 0 ? null : slotAt(9 + Math.floor(y / 20), (Math.floor(y / 10) % 2) * 30);

let store: SchedulerStateManager;
let manager: DragManager;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  store = new SchedulerStateManager();
  manager = new DragManager(store);
  manager.setSlotResolver(byY);
});

afterEach(() => {
  manager.destroy();
  vi.useRealTimers();
});

const frame = () => vi.advanceTimersToNextFrame();

describe('DragManager', () => {
  it('a pointer-down waits for the threshold and touches no store state', () => {
    manager.handlePointerDown(pointer(0, 0), { type: 'slot' });
    expect(manager.isPending()).toBe(true);
    expect(manager.isDragging()).toBe(true);
    expect(manager.isActive()).toBe(false);
    expect(manager.getPhase()).toBe('pending');
    expect(store.getState().dragState).toBeNull();
  });

  it('an immediate (touch) pointer-down is active at once and mirrored into the store', () => {
    manager.handlePointerDown(pointer(0, 0), { type: 'event', event: EVENT }, true);
    expect(manager.isActive()).toBe(true);
    const state = store.getState();
    expect(state.dragState?.type).toBe('move');
    expect(state.dragState?.event).toBe(EVENT);
    expect(state.previewEvent).toEqual({ start: EVENT.start, end: EVENT.end });
    expect(state.isMouseDown).toBe(true);
  });

  it('ignores moves when no drag is in progress', () => {
    manager.handlePointerMove(pointer(0, 40));
    frame();
    expect(manager.getPhase()).toBe('idle');
    expect(store.getState().previewEvent).toBeNull();
  });

  it('coalesces moves into one update per frame, using the latest pointer', () => {
    const resolver = vi.fn(byY);
    manager.setSlotResolver(resolver);
    manager.handlePointerDown(pointer(0, 0), { type: 'slot' });
    resolver.mockClear();

    manager.handlePointerMove(pointer(0, 20));
    manager.handlePointerMove(pointer(0, 40));
    manager.handlePointerMove(pointer(0, 60));
    // Nothing is resolved before the frame fires.
    expect(resolver).not.toHaveBeenCalled();
    frame();

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledWith(0, 60);
    expect(manager.isActive()).toBe(true);
    expect(store.getState().previewEvent).toEqual({
      start: slotAt(9).start,
      end: slotAt(12).end,
    });
  });

  it('keeps the store preview in step while an active drag moves', () => {
    manager.handlePointerDown(pointer(0, 0), { type: 'slot' });
    manager.handlePointerMove(pointer(0, 20));
    frame();
    const first = store.getState().dragState;
    manager.handlePointerMove(pointer(0, 40));
    frame();
    const state = store.getState();
    expect(state.dragState?.startSlot).toEqual(first?.startSlot);
    expect(state.dragState?.currentSlot).toEqual(slotAt(11));
    expect(state.previewEvent?.end).toEqual(slotAt(11).end);
  });

  it('a pointer-down with no slot resolver has no slot and cannot activate a create', () => {
    const bare = new DragManager(store);
    bare.handlePointerDown(pointer(0, 0), { type: 'slot' });
    bare.handlePointerMove(pointer(0, 40));
    frame();
    expect(bare.getPhase()).toBe('idle');
    bare.destroy();
  });

  it('a release after a real drag returns the completed result and clears the store', () => {
    manager.handlePointerDown(pointer(0, 0), { type: 'slot' });
    manager.handlePointerMove(pointer(0, 40));
    frame();

    const result = manager.handlePointerUp(pointer(0, 40));
    expect(result).toMatchObject({ type: 'create', wasClick: false, event: null });
    expect(result?.preview).toEqual({ start: slotAt(9).start, end: slotAt(11).end });
    expect(manager.getPhase()).toBe('idle');
    const state = store.getState();
    expect(state.dragState).toBeNull();
    expect(state.previewEvent).toBeNull();
    expect(state.isMouseDown).toBe(false);
  });

  it('a release before the threshold is reported as a click on the event', () => {
    manager.handlePointerDown(pointer(0, 0), { type: 'event', event: EVENT });
    const result = manager.handlePointerUp(pointer(1, 1));
    expect(result).toMatchObject({ type: 'move', wasClick: true, event: EVENT });
  });

  it('a release drops a move still waiting for its frame', () => {
    const resolver = vi.fn(byY);
    manager.setSlotResolver(resolver);
    manager.handlePointerDown(pointer(0, 0), { type: 'slot' });
    manager.handlePointerMove(pointer(0, 40));
    manager.handlePointerUp(pointer(0, 40));
    resolver.mockClear();
    frame();
    expect(resolver).not.toHaveBeenCalled();
  });

  it('a release with no drag returns nothing', () => {
    expect(manager.handlePointerUp(pointer(0, 0))).toBeNull();
  });

  it('cancel abandons an active drag and clears the store preview', () => {
    manager.handlePointerDown(pointer(0, 0), { type: 'event', event: EVENT }, true);
    manager.handlePointerMove(pointer(0, 40));
    manager.cancel();
    frame();
    expect(manager.getPhase()).toBe('idle');
    expect(store.getState().dragState).toBeNull();
    expect(store.getState().previewEvent).toBeNull();
  });

  it('reset returns the machine to idle', () => {
    manager.handlePointerDown(pointer(0, 0), { type: 'slot' });
    manager.reset();
    expect(manager.isDragging()).toBe(false);
  });

  it('destroy drops the resolver and any queued frame', () => {
    const resolver = vi.fn(byY);
    manager.setSlotResolver(resolver);
    manager.handlePointerDown(pointer(0, 0), { type: 'slot' });
    resolver.mockClear();
    manager.handlePointerMove(pointer(0, 40));
    manager.destroy();
    frame();
    expect(resolver).not.toHaveBeenCalled();
  });

  it('a threshold-crossing move over no slot keeps the drag pending on its start slot', () => {
    manager.handlePointerDown(pointer(0, 0), { type: 'slot' });
    manager.handlePointerMove(pointer(0, -50));
    frame();
    // The start slot is enough to activate; the preview stays on it.
    expect(manager.isActive()).toBe(true);
    expect(store.getState().previewEvent).toEqual({ start: slotAt(9).start, end: slotAt(9).end });
  });

  it('honours a custom threshold', () => {
    const sticky = new DragManager(store, { dragThreshold: 100 });
    sticky.setSlotResolver(byY);
    sticky.handlePointerDown(pointer(0, 0), { type: 'slot' });
    sticky.handlePointerMove(pointer(0, 60));
    frame();
    expect(sticky.isPending()).toBe(true);
    sticky.destroy();
  });
});
