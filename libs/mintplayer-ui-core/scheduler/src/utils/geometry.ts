/**
 * Pure geometry for the scheduler's pointer paths.
 *
 * These take numbers and return numbers so the arithmetic can be pinned by
 * specs without faking a single rect value (R3, PRD test-coverage P2-D4). The
 * callers read the live geometry and pass it in.
 */

export interface EdgeRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Vector {
  x: number;
  y: number;
}

/**
 * Per-frame auto-scroll step while a drag is near a scroller edge.
 *
 * Each axis is 0 outside the `zone`-wide band along an edge and ramps
 * linearly to `max` px per frame at the edge itself (clamped beyond it), with
 * the sign pointing toward that edge: negative scrolls toward left/top.
 */
export function edgeScrollVector(
  point: Vector,
  rect: EdgeRect,
  zone: number,
  max: number,
): Vector {
  const axis = (position: number, low: number, high: number): number => {
    if (position < low + zone) return -Math.min(1, (low + zone - position) / zone) * max;
    if (position > high - zone) return Math.min(1, (position - (high - zone)) / zone) * max;
    return 0;
  };
  return {
    x: axis(point.x, rect.left, rect.right),
    y: axis(point.y, rect.top, rect.bottom),
  };
}

/**
 * Clamp a requested resource-column width to what the scroller can hold.
 *
 * Never narrower than `minColumn`, and never so wide that less than `minGrid`
 * px of grid remains; when the scroller is too narrow for both, `minColumn`
 * wins. The result is rounded to a whole pixel.
 */
export function clampColumnWidth(
  requested: number,
  containerWidth: number,
  minColumn: number,
  minGrid: number,
): number {
  const max = Math.max(minColumn, containerWidth - minGrid);
  return Math.round(Math.min(Math.max(requested, minColumn), max));
}

/**
 * The resource column's share of the scroller, as the whole percentage the
 * window-splitter pattern reports in `aria-valuenow`. A zero-width scroller
 * (not laid out yet) is treated as 1px rather than dividing by zero.
 */
export function columnWidthPercent(width: number, containerWidth: number): number {
  return Math.round((width / (containerWidth || 1)) * 100);
}
