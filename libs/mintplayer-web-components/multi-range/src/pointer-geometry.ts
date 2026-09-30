/** The parts of a track's bounding rect the pointer mapping reads. */
export interface TrackRect {
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface TrackAxis {
  vertical: boolean;
  /** Only read for a horizontal track: RTL measures from the right edge. */
  rtl: boolean;
}

/**
 * Where a pointer sits along the track, as a fraction in [0, 1] from the
 * track's start (bottom when vertical, the inline-start edge otherwise).
 * Positions past either end clamp to it.
 *
 * Returns null when the track has no length on its axis: an unrendered or
 * collapsed track (display: none, a zero-size container) has no position to
 * map to, and dividing by its zero length would turn the value into NaN.
 */
export function pointerFraction(
  rect: TrackRect,
  clientX: number,
  clientY: number,
  axis: TrackAxis
): number | null {
  const length = axis.vertical ? rect.height : rect.width;
  if (!(length > 0)) return null;
  const offset = axis.vertical
    ? rect.bottom - clientY
    : axis.rtl
      ? rect.right - clientX
      : clientX - rect.left;
  return Math.min(1, Math.max(0, offset / length));
}

/**
 * The index of the thumb closest to `target`. Ties (thumbs stacked on one
 * value) break by side: a target above the stack picks its highest-index
 * thumb, one below or on it picks the lowest. Without this a stack would
 * always pick the lowest thumb, which its higher neighbours block from moving
 * up toward the target, so the press would do nothing.
 */
export function nearestThumbIndex(values: readonly number[], target: number): number {
  return values.reduce((best, v, i) => {
    const dBest = Math.abs(values[best] - target);
    const dCur = Math.abs(v - target);
    if (dCur < dBest) return i;
    if (dCur > dBest) return best;
    return target > v ? i : best;
  }, 0);
}
