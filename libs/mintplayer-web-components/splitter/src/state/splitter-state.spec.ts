import { describe, expect, it, vi } from 'vitest';

import { SplitterStateManager } from './splitter-state';
import { ResizeState, type ResizeOperation } from '../types';

/**
 * The splitter's state store. Two properties do the work here and both are
 * easy to break by accident:
 *
 * **Nothing escapes by reference.** Every getter hands out a copy and every
 * setter takes one, so a subscriber cannot mutate the store by editing what it
 * was handed. Without that, a consumer that keeps the sizes array and sorts it
 * silently reorders the panels.
 *
 * **A live size and a preview size are different things.** During a drag the
 * preview follows the pointer while the committed sizes stay put, which is what
 * lets a cancelled drag snap back to where it started rather than to wherever
 * the pointer happened to be.
 */

const operation = (): ResizeOperation => ({
  state: ResizeState.Resizing,
  startPosition: { x: 0, y: 0 },
  sizes: [100, 100],
  indexBefore: 0,
  indexAfter: 1,
  dividerElement: null,
});

describe('SplitterStateManager — construction', () => {
  it('starts horizontal with nothing in it', () => {
    expect(new SplitterStateManager().getState()).toEqual({
      orientation: 'horizontal',
      panelSizes: [],
      previewSizes: null,
      resizeOperation: null,
    });
  });

  it('takes an initial state', () => {
    const manager = new SplitterStateManager({ orientation: 'vertical', panelSizes: [1, 2] });
    expect(manager.getState()).toMatchObject({ orientation: 'vertical', panelSizes: [1, 2] });
  });

  it('fills in whatever the initial state omits', () => {
    const manager = new SplitterStateManager({ orientation: 'vertical' });
    expect(manager.getState().panelSizes).toEqual([]);
  });
});

describe('SplitterStateManager — the state is copied out', () => {
  it('hands out a new object each time', () => {
    const manager = new SplitterStateManager();
    expect(manager.getState()).not.toBe(manager.getState());
  });

  // A subscriber that keeps the array it was given must not be able to reach
  // back into the store through it.
  it('cannot be mutated through a state it handed out', () => {
    const manager = new SplitterStateManager({ panelSizes: [100, 200] });

    manager.getState().panelSizes.push(999);

    expect(manager.getState().panelSizes).toEqual([100, 200]);
  });

  it('copies the sizes on the way in as well', () => {
    const manager = new SplitterStateManager();
    const sizes = [100, 200];

    manager.setPanelSizes(sizes);
    sizes.push(999);

    expect(manager.getState().panelSizes).toEqual([100, 200]);
  });

  it('copies preview sizes on the way in', () => {
    const manager = new SplitterStateManager();
    const preview = [10, 20];

    manager.setPreviewSizes(preview);
    preview[0] = 999;

    expect(manager.getState().previewSizes).toEqual([10, 20]);
  });

  it('copies the resize operation on the way in', () => {
    const manager = new SplitterStateManager();
    const op = operation();

    manager.startResize(op);
    op.indexBefore = 99;

    expect(manager.getState().resizeOperation?.indexBefore).toBe(0);
  });
});

describe('SplitterStateManager — subscribers', () => {
  it('notifies on a change', () => {
    const manager = new SplitterStateManager();
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.setPanelSizes([1, 2]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].panelSizes).toEqual([1, 2]);
  });

  it('notifies every subscriber', () => {
    const manager = new SplitterStateManager();
    const first = vi.fn();
    const second = vi.fn();
    manager.subscribe(first);
    manager.subscribe(second);

    manager.setPanelSizes([1]);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', () => {
    const manager = new SplitterStateManager();
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    unsubscribe();
    manager.setPanelSizes([1]);

    expect(listener).not.toHaveBeenCalled();
  });

  it('tolerates unsubscribing twice', () => {
    const manager = new SplitterStateManager();
    const unsubscribe = manager.subscribe(vi.fn());
    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
  });

  // Orientation is the one setter that checks first, because it is re-applied
  // on every render — notifying unconditionally would loop through anything
  // that re-renders on state change.
  it('stays silent when the orientation does not actually change', () => {
    const manager = new SplitterStateManager({ orientation: 'horizontal' });
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.setOrientation('horizontal');

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies when the orientation does change', () => {
    const manager = new SplitterStateManager({ orientation: 'horizontal' });
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.setOrientation('vertical');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('gives each subscriber the same snapshot of one change', () => {
    const manager = new SplitterStateManager();
    const seen: unknown[] = [];
    manager.subscribe((s) => seen.push(s.panelSizes));
    manager.subscribe((s) => seen.push(s.panelSizes));

    manager.setPanelSizes([5]);

    expect(seen[0]).toEqual([5]);
    expect(seen[1]).toEqual([5]);
  });
});

describe('SplitterStateManager — a resize gesture', () => {
  it('is not resizing until one starts', () => {
    expect(new SplitterStateManager().isResizing()).toBe(false);
  });

  it('is resizing once one starts', () => {
    const manager = new SplitterStateManager();
    manager.startResize(operation());
    expect(manager.isResizing()).toBe(true);
  });

  // The committed sizes stay where they were during the drag; only the preview
  // follows the pointer. That separation is what a cancel relies on.
  it('leaves the committed sizes alone while previewing', () => {
    const manager = new SplitterStateManager({ panelSizes: [100, 100] });
    manager.startResize(operation());

    manager.updateResize([150, 50]);

    expect(manager.getState().previewSizes).toEqual([150, 50]);
    expect(manager.getState().panelSizes).toEqual([100, 100]);
  });

  it('commits the final sizes and clears the gesture on end', () => {
    const manager = new SplitterStateManager({ panelSizes: [100, 100] });
    manager.startResize(operation());
    manager.updateResize([150, 50]);

    manager.endResize([150, 50]);

    expect(manager.getState()).toMatchObject({
      panelSizes: [150, 50],
      previewSizes: null,
      resizeOperation: null,
    });
    expect(manager.isResizing()).toBe(false);
  });

  // Escape mid-drag has to land back on the sizes the drag started from, not
  // on wherever the pointer was.
  it('throws away the preview on cancel and keeps the committed sizes', () => {
    const manager = new SplitterStateManager({ panelSizes: [100, 100] });
    manager.startResize(operation());
    manager.updateResize([190, 10]);

    manager.cancelResize();

    expect(manager.getState()).toMatchObject({
      panelSizes: [100, 100],
      previewSizes: null,
      resizeOperation: null,
    });
    expect(manager.isResizing()).toBe(false);
  });

  it('notifies through the whole gesture', () => {
    const manager = new SplitterStateManager();
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.startResize(operation());
    manager.updateResize([1, 1]);
    manager.endResize([1, 1]);

    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('clears a preview set outside a gesture', () => {
    const manager = new SplitterStateManager();
    manager.setPreviewSizes([1, 2]);
    manager.setPreviewSizes(null);
    expect(manager.getState().previewSizes).toBeNull();
  });

  it('is not resizing for an idle operation', () => {
    const manager = new SplitterStateManager();
    manager.startResize({ ...operation(), state: ResizeState.Idle });
    expect(manager.isResizing()).toBe(false);
  });
});
