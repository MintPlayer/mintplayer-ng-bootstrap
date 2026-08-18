import { describe, expect, it } from 'vitest';

import { ResizeManager } from './resize-manager';
import { ResizeState } from '../types';

/**
 * The splitter's resize arithmetic. It runs on every pointer move of a drag,
 * so its whole job is to answer "what would the panels be if I let go here" —
 * and the answers that matter are the ones at the limits, which are also the
 * ones a hand test never reaches because they need a fast drag past the edge.
 *
 * The rule the constraints exist for: a panel that reaches zero cannot be
 * dragged back, because there is nothing left to grab. The minimum is what
 * keeps a splitter recoverable.
 */

const rect = (width: number, height: number): DOMRect =>
  ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  }) as DOMRect;

function panel(width: number, height: number): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => rect(width, height);
  return el;
}

const divider = () => document.createElement('div');

describe('ResizeManager — measuring panels', () => {
  it('measures widths along a horizontal split', () => {
    const manager = new ResizeManager();
    expect(manager.computePanelSizes([panel(300, 100), panel(200, 100)], 'horizontal')).toEqual([
      300, 200,
    ]);
  });

  it('measures heights along a vertical split', () => {
    const manager = new ResizeManager();
    expect(manager.computePanelSizes([panel(300, 100), panel(300, 250)], 'vertical')).toEqual([
      100, 250,
    ]);
  });

  it('measures nothing for no panels', () => {
    expect(new ResizeManager().computePanelSizes([], 'horizontal')).toEqual([]);
  });
});

describe('ResizeManager — starting an operation', () => {
  const manager = new ResizeManager();

  it('records the divider and the pair it sits between', () => {
    const el = divider();
    const operation = manager.createResizeOperation({ x: 10, y: 20 }, [100, 200], 0, el);

    expect(operation).toMatchObject({
      state: ResizeState.Resizing,
      indexBefore: 0,
      indexAfter: 1,
      dividerElement: el,
    });
  });

  // Copies, not references: the operation is the anchor every later move
  // measures from, so it must not drift when the live sizes change.
  it('snapshots the start point and sizes rather than aliasing them', () => {
    const start = { x: 10, y: 20 };
    const sizes = [100, 200];

    const operation = manager.createResizeOperation(start, sizes, 0, divider());
    start.x = 999;
    sizes[0] = 999;

    expect(operation.startPosition).toEqual({ x: 10, y: 20 });
    expect(operation.sizes).toEqual([100, 200]);
  });
});

describe('ResizeManager — the preview during a drag', () => {
  const manager = new ResizeManager();
  const operation = manager.createResizeOperation({ x: 100, y: 100 }, [300, 300], 0, divider());

  it('moves the boundary by the horizontal delta', () => {
    expect(manager.calculatePreviewSizes(operation, { x: 150, y: 100 }, 'horizontal')).toEqual([
      350, 250,
    ]);
  });

  it('reads the vertical delta for a vertical split', () => {
    expect(manager.calculatePreviewSizes(operation, { x: 999, y: 150 }, 'vertical')).toEqual([
      350, 250,
    ]);
  });

  it('ignores the off-axis coordinate', () => {
    const alongAxis = manager.calculatePreviewSizes(operation, { x: 150, y: 100 }, 'horizontal');
    const wandering = manager.calculatePreviewSizes(operation, { x: 150, y: 9999 }, 'horizontal');
    expect(wandering).toEqual(alongAxis);
  });

  // A splitter moves a boundary; it does not resize its container. If the pair
  // total drifts the panels stop filling the track.
  it('conserves the pair total at every delta', () => {
    for (const x of [-9999, -100, 0, 100, 9999]) {
      const [before, after] = manager.calculatePreviewSizes(operation, { x, y: 100 }, 'horizontal');
      expect(before + after).toBe(600);
    }
  });

  it('leaves panels outside the pair untouched', () => {
    const wide = manager.createResizeOperation({ x: 0, y: 0 }, [100, 200, 300], 1, divider());
    const [first] = manager.calculatePreviewSizes(wide, { x: 50, y: 0 }, 'horizontal');
    expect(first).toBe(100);
  });

  it('is a no-op at zero delta', () => {
    expect(manager.calculatePreviewSizes(operation, { x: 100, y: 100 }, 'horizontal')).toEqual([
      300, 300,
    ]);
  });

  it('does not mutate the operation it was given', () => {
    manager.calculatePreviewSizes(operation, { x: 400, y: 100 }, 'horizontal');
    expect(operation.sizes).toEqual([300, 300]);
  });
});

describe('ResizeManager — the minimum size', () => {
  const manager = new ResizeManager({ minPanelSize: 50 });
  const operation = manager.createResizeOperation({ x: 100, y: 100 }, [300, 300], 0, divider());

  it('stops the trailing panel at the minimum', () => {
    expect(manager.calculatePreviewSizes(operation, { x: 9999, y: 100 }, 'horizontal')).toEqual([
      550, 50,
    ]);
  });

  it('stops the leading panel at the minimum', () => {
    expect(manager.calculatePreviewSizes(operation, { x: -9999, y: 100 }, 'horizontal')).toEqual([
      50, 550,
    ]);
  });

  it('defaults to a 50px floor', () => {
    const defaults = new ResizeManager();
    expect(defaults.getMinPanelSize()).toBe(50);
  });

  it('honours a configured floor', () => {
    const roomy = new ResizeManager({ minPanelSize: 120 });
    const op = roomy.createResizeOperation({ x: 0, y: 0 }, [300, 300], 0, divider());
    expect(roomy.calculatePreviewSizes(op, { x: 9999, y: 0 }, 'horizontal')).toEqual([480, 120]);
  });

  it('can be changed after construction', () => {
    const adjustable = new ResizeManager();
    adjustable.setMinPanelSize(200);
    expect(adjustable.getMinPanelSize()).toBe(200);

    const op = adjustable.createResizeOperation({ x: 0, y: 0 }, [300, 300], 0, divider());
    expect(adjustable.calculatePreviewSizes(op, { x: 9999, y: 0 }, 'horizontal')).toEqual([400, 200]);
  });

  // A minimum larger than half the track cannot be honoured on both sides. The
  // clamp is applied last so neither panel goes negative, which is the failure
  // that would actually break the layout.
  it('never produces a negative panel when the pair cannot hold two minimums', () => {
    const cramped = new ResizeManager({ minPanelSize: 100 });
    const op = cramped.createResizeOperation({ x: 0, y: 0 }, [60, 60], 0, divider());

    const [before, after] = cramped.calculatePreviewSizes(op, { x: 500, y: 0 }, 'horizontal');

    expect(before).toBeGreaterThanOrEqual(100);
    expect(after).toBeGreaterThanOrEqual(100);
  });

  it('allows a zero floor when a consumer asks for one', () => {
    const unconstrained = new ResizeManager({ minPanelSize: 0 });
    const op = unconstrained.createResizeOperation({ x: 0, y: 0 }, [300, 300], 0, divider());
    expect(unconstrained.calculatePreviewSizes(op, { x: 300, y: 0 }, 'horizontal')).toEqual([600, 0]);
  });
});
