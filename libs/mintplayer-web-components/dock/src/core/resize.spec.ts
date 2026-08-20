import { describe, expect, it } from 'vitest';

import {
  FLOATING_MIN_HEIGHT,
  FLOATING_MIN_WIDTH,
  headerInsertIndex,
  resizeFloatingBounds,
  resizePair,
  snapToNearestTarget,
  snapToRatio,
  type FloatingResizeEdges,
} from './resize';

/**
 * Resize arithmetic. Two things make this worth specifying densely rather than
 * driving through the element:
 *
 * jsdom reports every rect as zero, so a pointer-driven test of a resize can
 * only ever assert that nothing threw. And each of these rules is reached from
 * *two* input paths — a pointer drag and a keyboard arrow — which used to carry
 * a copy of the maths each. A divergence between them is invisible in practice,
 * because a mouse user and a keyboard user do not compare results.
 */

const HOST = { width: 1000, height: 800 };
const START = { left: 300, top: 200, width: 400, height: 300 };

const edges = (
  horizontal: FloatingResizeEdges['horizontal'],
  vertical: FloatingResizeEdges['vertical'] = 'none',
): FloatingResizeEdges => ({ horizontal, vertical });

describe('resizeFloatingBounds — dragging a right or bottom edge', () => {
  it('grows the window and leaves the origin alone', () => {
    const out = resizeFloatingBounds(START, edges('right'), { x: 100, y: 0 }, HOST);
    expect(out).toEqual({ left: 300, top: 200, width: 500, height: 300 });
  });

  it('shrinks when dragged inward', () => {
    expect(resizeFloatingBounds(START, edges('right'), { x: -100, y: 0 }, HOST).width).toBe(300);
  });

  it('grows downward for a bottom edge', () => {
    const out = resizeFloatingBounds(START, edges('none', 'bottom'), { x: 0, y: 80 }, HOST);
    expect(out).toMatchObject({ top: 200, height: 380 });
  });

  // The far edge is anchored, so the window can only grow into the space that
  // is actually there.
  it('stops the right edge at the host boundary', () => {
    expect(resizeFloatingBounds(START, edges('right'), { x: 9999, y: 0 }, HOST).width).toBe(700);
  });

  it('stops the bottom edge at the host boundary', () => {
    expect(resizeFloatingBounds(START, edges('none', 'bottom'), { x: 0, y: 9999 }, HOST).height).toBe(
      600,
    );
  });
});

describe('resizeFloatingBounds — dragging a left or top edge', () => {
  // The opposite edge stays put, so the origin has to move by exactly as much
  // as the size changes. Getting this wrong slides the whole window sideways
  // while resizing it, which reads as the window "running away" from the mouse.
  it('moves the origin and keeps the far edge fixed', () => {
    const out = resizeFloatingBounds(START, edges('left'), { x: -100, y: 0 }, HOST);
    expect(out).toMatchObject({ left: 200, width: 500 });
    expect(out.left + out.width).toBe(START.left + START.width);
  });

  it('keeps the bottom edge fixed when dragging the top', () => {
    const out = resizeFloatingBounds(START, edges('none', 'top'), { x: 0, y: -50 }, HOST);
    expect(out.top + out.height).toBe(START.top + START.height);
  });

  it('shrinks from the left when dragged inward', () => {
    const out = resizeFloatingBounds(START, edges('left'), { x: 100, y: 0 }, HOST);
    expect(out).toMatchObject({ left: 400, width: 300 });
  });

  // A fast drag past the edge must not push the title bar off-screen, where
  // there is nothing left to grab.
  it('never lets the left edge cross the origin', () => {
    const out = resizeFloatingBounds(START, edges('left'), { x: -9999, y: 0 }, HOST);
    expect(out.left).toBe(0);
    expect(out.width).toBe(700);
  });

  it('never lets the top edge cross the origin', () => {
    const out = resizeFloatingBounds(START, edges('none', 'top'), { x: 0, y: -9999 }, HOST);
    expect(out.top).toBe(0);
    expect(out.height).toBe(500);
  });
});

describe('resizeFloatingBounds — minimum size', () => {
  it('refuses to shrink below the minimum width', () => {
    expect(resizeFloatingBounds(START, edges('right'), { x: -9999, y: 0 }, HOST).width).toBe(
      FLOATING_MIN_WIDTH,
    );
  });

  it('refuses to shrink below the minimum height', () => {
    expect(resizeFloatingBounds(START, edges('none', 'bottom'), { x: 0, y: -9999 }, HOST).height).toBe(
      FLOATING_MIN_HEIGHT,
    );
  });

  it('keeps the far edge anchored when it hits the minimum from the left', () => {
    const out = resizeFloatingBounds(START, edges('left'), { x: 9999, y: 0 }, HOST);
    expect(out.width).toBe(FLOATING_MIN_WIDTH);
    expect(out.left + out.width).toBe(START.left + START.width);
  });

  // A cramped window beats one that overflows the dock: the overflowing one
  // has parts the user cannot reach at all.
  it('drops below the nominal minimum when the host is smaller than it', () => {
    const tiny = { width: 100, height: 60 };
    const out = resizeFloatingBounds(
      { left: 0, top: 0, width: 90, height: 50 },
      edges('right', 'bottom'),
      { x: -9999, y: -9999 },
      tiny,
    );
    expect(out.width).toBe(100);
    expect(out.height).toBe(60);
  });

  it('keeps the nominal minimum while the host is unmeasured', () => {
    const out = resizeFloatingBounds(START, edges('right'), { x: -9999, y: 0 }, { width: 0, height: 0 });
    expect(out.width).toBe(FLOATING_MIN_WIDTH);
  });

  it('does not cap against an unmeasured host', () => {
    const out = resizeFloatingBounds(START, edges('right'), { x: 500, y: 0 }, { width: 0, height: 0 });
    expect(out.width).toBe(900);
  });
});

describe('resizeFloatingBounds — the rest', () => {
  it('resizes both axes from a corner handle', () => {
    const out = resizeFloatingBounds(START, edges('right', 'bottom'), { x: 50, y: 40 }, HOST);
    expect(out).toEqual({ left: 300, top: 200, width: 450, height: 340 });
  });

  it('moves the origin on both axes from the opposite corner', () => {
    const out = resizeFloatingBounds(START, edges('left', 'top'), { x: -50, y: -40 }, HOST);
    expect(out).toEqual({ left: 250, top: 160, width: 450, height: 340 });
  });

  it('leaves an axis untouched when its handle drives no edge', () => {
    const out = resizeFloatingBounds(START, edges('none', 'none'), { x: 100, y: 100 }, HOST);
    expect(out).toEqual(START);
  });

  it('is a no-op for a zero delta', () => {
    expect(resizeFloatingBounds(START, edges('right', 'bottom'), { x: 0, y: 0 }, HOST)).toEqual(START);
  });

  it('never mutates the bounds it was given', () => {
    const start = { ...START };
    resizeFloatingBounds(start, edges('left', 'top'), { x: -30, y: -30 }, HOST);
    expect(start).toEqual(START);
  });

  /*
   * The regression this extraction exists to prevent, asserted against the
   * keyboard path's ORIGINAL formulation rather than against itself.
   *
   * The keyboard handler used to carry its own copy of the arithmetic, written
   * in terms of how much the window GROWS (with the sign inverted for a left or
   * top handle) rather than how far the handle MOVED. The two are equivalent —
   * that equivalence is why one function can serve both — and this pins it, so
   * a future change to the shared rule cannot quietly alter what an arrow key
   * does while leaving the mouse correct.
   */
  function legacyKeyboardBounds(
    start: typeof START,
    e: FloatingResizeEdges,
    horizontalSteps: number,
    verticalSteps: number,
    step: number,
    host: { width: number; height: number },
  ) {
    const minWidth = host.width > 0 ? Math.min(FLOATING_MIN_WIDTH, host.width) : FLOATING_MIN_WIDTH;
    const minHeight =
      host.height > 0 ? Math.min(FLOATING_MIN_HEIGHT, host.height) : FLOATING_MIN_HEIGHT;
    const bounds = { ...start };

    if (horizontalSteps !== 0 && e.horizontal !== 'none') {
      const grow = e.horizontal === 'left' ? -horizontalSteps * step : horizontalSteps * step;
      let newWidth = Math.max(minWidth, bounds.width + grow);
      if (e.horizontal === 'left') {
        newWidth = Math.min(newWidth, bounds.left + bounds.width);
        bounds.left = bounds.left + bounds.width - newWidth;
      } else if (host.width > 0) {
        newWidth = Math.min(newWidth, host.width - bounds.left);
      }
      bounds.width = newWidth;
    }
    if (verticalSteps !== 0 && e.vertical !== 'none') {
      const grow = e.vertical === 'top' ? -verticalSteps * step : verticalSteps * step;
      let newHeight = Math.max(minHeight, bounds.height + grow);
      if (e.vertical === 'top') {
        newHeight = Math.min(newHeight, bounds.top + bounds.height);
        bounds.top = bounds.top + bounds.height - newHeight;
      } else if (host.height > 0) {
        newHeight = Math.min(newHeight, host.height - bounds.top);
      }
      bounds.height = newHeight;
    }
    return bounds;
  }

  const HANDLES = [
    ['right', 'none'],
    ['left', 'none'],
    ['none', 'top'],
    ['none', 'bottom'],
    ['left', 'top'],
    ['right', 'bottom'],
  ] as const;

  it.each(HANDLES)('matches the original keyboard maths for a %s/%s handle', (h, v) => {
    for (const steps of [-10, -1, 1, 10]) {
      for (const step of [1, 10]) {
        const shared = resizeFloatingBounds(
          START,
          edges(h, v),
          { x: steps * step, y: steps * step },
          HOST,
        );
        expect(shared).toEqual(legacyKeyboardBounds(START, edges(h, v), steps, steps, step, HOST));
      }
    }
  });

  it.each(HANDLES)('matches it against an unmeasured host too for %s/%s', (h, v) => {
    const unmeasured = { width: 0, height: 0 };
    const shared = resizeFloatingBounds(START, edges(h, v), { x: -500, y: -500 }, unmeasured);
    expect(shared).toEqual(legacyKeyboardBounds(START, edges(h, v), -50, -50, 10, unmeasured));
  });
});

describe('snapToRatio', () => {
  it.each([
    [0.3, 1 / 3],
    [0.45, 1 / 2],
    [0.7, 2 / 3],
  ])('pulls %d of the track onto the nearest conventional ratio', (fraction, expected) => {
    expect(snapToRatio(fraction * 1000, 1000)).toBeCloseTo(expected * 1000, 6);
  });

  // No tolerance, on purpose: it only runs while the user is holding a modifier
  // to ask for it, and a tolerance would make that modifier inert for most of
  // the track.
  it('snaps even from far away', () => {
    expect(snapToRatio(0, 900)).toBeCloseTo(300, 6);
    expect(snapToRatio(900, 900)).toBeCloseTo(600, 6);
  });

  it('leaves the value alone when the track has no size', () => {
    expect(snapToRatio(42, 0)).toBe(42);
    expect(snapToRatio(42, -1)).toBe(42);
  });

  it('is idempotent', () => {
    const once = snapToRatio(0.4 * 900, 900);
    expect(snapToRatio(once, 900)).toBeCloseTo(once, 6);
  });
});

describe('snapToNearestTarget', () => {
  it('pulls onto a target inside the tolerance', () => {
    expect(snapToNearestTarget(103, [100, 400], 10)).toBe(100);
  });

  it('picks the nearest of several targets', () => {
    expect(snapToNearestTarget(105, [100, 108, 400], 10)).toBe(108);
  });

  // Ties go to the earlier target, which keeps the snap stable rather than
  // flipping between two equidistant guides as the pointer jitters.
  it('breaks a tie in favour of the first target', () => {
    expect(snapToNearestTarget(104, [100, 108], 10)).toBe(100);
  });

  // It runs on every pointer move without being asked, so doing nothing is the
  // common case and the important one.
  it('leaves the value alone outside the tolerance', () => {
    expect(snapToNearestTarget(150, [100, 400], 10)).toBe(150);
  });

  it('snaps at exactly the tolerance', () => {
    expect(snapToNearestTarget(110, [100], 10)).toBe(100);
  });

  it('leaves the value alone when there are no targets', () => {
    expect(snapToNearestTarget(150, [], 10)).toBe(150);
  });

  it('handles targets on both sides', () => {
    expect(snapToNearestTarget(100, [95, 106], 10)).toBe(95);
  });
});

describe('resizePair', () => {
  it('moves the boundary by the delta', () => {
    expect(resizePair(300, 300, 50, 48)).toEqual({ before: 350, after: 250 });
  });

  // A splitter moves a boundary; it does not resize the container. If the total
  // drifts, the panels stop filling their track.
  it('conserves the pair total', () => {
    for (const delta of [-500, -50, 0, 50, 500]) {
      const { before, after } = resizePair(300, 300, delta, 48);
      expect(before + after).toBe(600);
    }
  });

  // A panel dragged to zero can never be dragged back, because there is nothing
  // left to grab.
  it('leaves a grabbable sliver at each end', () => {
    expect(resizePair(300, 300, -9999, 48)).toEqual({ before: 48, after: 552 });
    expect(resizePair(300, 300, 9999, 48)).toEqual({ before: 552, after: 48 });
  });

  it('snaps to a conventional ratio when asked', () => {
    const { before } = resizePair(300, 300, 20, 48, true);
    expect(before).toBeCloseTo(300, 6);
  });

  it('does not snap unless asked', () => {
    expect(resizePair(300, 300, 20, 48, false).before).toBe(320);
  });

  it('applies the minimum before snapping, so a snap cannot undercut it', () => {
    const { before, after } = resizePair(300, 300, -9999, 48, true);
    expect(before).toBeGreaterThanOrEqual(48);
    expect(before + after).toBe(600);
  });
});

describe('headerInsertIndex', () => {
  const MIDS = [50, 150, 250];

  it('inserts at the front when the pointer is left of everything', () => {
    expect(headerInsertIndex(MIDS, 10, null)).toBe(0);
  });

  it('inserts at the end when the pointer is past everything', () => {
    expect(headerInsertIndex(MIDS, 999, null)).toBe(3);
  });

  it('inserts before the tab whose midpoint the pointer has not reached', () => {
    expect(headerInsertIndex(MIDS, 120, null)).toBe(1);
    expect(headerInsertIndex(MIDS, 200, null)).toBe(2);
  });

  it('inserts after a tab once the pointer passes its midpoint', () => {
    expect(headerInsertIndex(MIDS, 151, null)).toBe(2);
  });

  it('returns 0 for an empty header', () => {
    expect(headerInsertIndex([], 100, null)).toBe(0);
  });

  /*
   * The bias is hysteresis, not a fudge. While a tab is being dragged right,
   * the placeholder still sits to its left, so the pointer reaches the next
   * tab's midpoint before the swap would settle — and the index oscillates
   * between two values across a couple of pixels, which the user sees as the
   * placeholder flickering. Pushing the threshold of every tab right of the
   * placeholder outward gives the swap somewhere to rest.
   */
  it('holds the index one bias-width longer for tabs right of the dragged one', () => {
    expect(headerInsertIndex(MIDS, 155, 50, 12)).toBe(1);
    expect(headerInsertIndex(MIDS, 163, 50, 12)).toBe(2);
  });

  it('applies no bias to tabs left of the dragged one', () => {
    expect(headerInsertIndex(MIDS, 51, 250, 12)).toBe(1);
  });

  it('applies the bias to the tab exactly at the dragged position', () => {
    expect(headerInsertIndex(MIDS, 155, 150, 12)).toBe(1);
  });

  it('behaves as if unbiased when the bias is zero', () => {
    expect(headerInsertIndex(MIDS, 155, 50, 0)).toBe(2);
  });
});
