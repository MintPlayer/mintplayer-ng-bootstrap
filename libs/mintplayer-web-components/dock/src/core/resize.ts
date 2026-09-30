import type { DockFloatingPaneBounds } from '../types/dock-layout';

/**
 * The arithmetic of every resize gesture in the dock, separated from the events
 * that drive it.
 *
 * It is here for a reason beyond testability. Each of these is reached from
 * **two** input paths — a pointer drag and a keyboard arrow — and the two used
 * to carry their own copy of the maths. Two implementations of one rule is a
 * bug waiting for someone to fix only one of them, and it is invisible while it
 * lasts because a mouse user and a keyboard user rarely compare notes.
 */

/** Which edges of a floating window a resize handle drives. */
export interface FloatingResizeEdges {
  horizontal: 'left' | 'right' | 'none';
  vertical: 'top' | 'bottom' | 'none';
}

/** Smallest usable floating window, in CSS pixels. */
export const FLOATING_MIN_WIDTH = 192;
export const FLOATING_MIN_HEIGHT = 128;

/**
 * The floor a floating window may shrink to, which is the nominal minimum
 * except in a host too small to hold it — there a cramped window beats one that
 * overflows the dock and cannot be reached.
 */
function floorFor(nominal: number, hostExtent: number): number {
  return hostExtent > 0 ? Math.min(nominal, hostExtent) : nominal;
}

/**
 * The bounds a floating window takes after dragging its handle by `delta` from
 * `start`.
 *
 * `delta` is expressed as the movement of the HANDLE, not as growth of the
 * window, and that is what lets a keyboard arrow reuse it unchanged: one press
 * of an arrow is `step` pixels of handle movement in that direction. Whether
 * the window grows or shrinks then follows from which edge the handle drives,
 * decided once, below, instead of once per input path.
 *
 * The two anchoring cases are the substance. Dragging a `right`/`bottom` edge
 * leaves the opposite edge where it is and grows the size; dragging a
 * `left`/`top` edge has to move the origin as well, and the window is capped so
 * that origin never crosses zero — otherwise a fast drag past the edge would
 * put the title bar off-screen, where it cannot be grabbed back.
 */
export function resizeFloatingBounds(
  start: DockFloatingPaneBounds,
  edges: FloatingResizeEdges,
  delta: { x: number; y: number },
  host: { width: number; height: number },
): DockFloatingPaneBounds {
  const minWidth = floorFor(FLOATING_MIN_WIDTH, host.width);
  const minHeight = floorFor(FLOATING_MIN_HEIGHT, host.height);

  let width = start.width;
  let height = start.height;
  let left = start.left;
  let top = start.top;

  if (edges.horizontal === 'right') {
    width = Math.max(minWidth, start.width + delta.x);
    if (host.width > 0) {
      width = Math.min(width, host.width - start.left);
    }
  } else if (edges.horizontal === 'left') {
    width = Math.max(minWidth, start.width - delta.x);
    width = Math.min(width, start.left + start.width);
    left = start.left + start.width - width;
  }

  if (edges.vertical === 'bottom') {
    height = Math.max(minHeight, start.height + delta.y);
    if (host.height > 0) {
      height = Math.min(height, host.height - start.top);
    }
  } else if (edges.vertical === 'top') {
    height = Math.max(minHeight, start.height - delta.y);
    height = Math.min(height, start.top + start.height);
    top = start.top + start.height - height;
  }

  return { left, top, width, height };
}

/** The ratios a splitter snaps to while a modifier is held. */
const SNAP_RATIOS = [1 / 3, 1 / 2, 2 / 3];

/**
 * The nearest of the conventional layout ratios, in pixels.
 *
 * Unconditional: it snaps to whichever ratio is closest with no tolerance,
 * because it only runs while the user is *holding a modifier to ask for it*.
 * A tolerance there would make the modifier do nothing for most of the track.
 */
export function snapToRatio(value: number, total: number): number {
  if (total <= 0) return value;
  const ratio = value / total;
  let best = SNAP_RATIOS[0];
  let distance = Math.abs(ratio - best);
  for (let i = 1; i < SNAP_RATIOS.length; i += 1) {
    const candidate = Math.abs(ratio - SNAP_RATIOS[i]);
    if (candidate < distance) {
      distance = candidate;
      best = SNAP_RATIOS[i];
    }
  }
  return best * total;
}

/**
 * `value` pulled onto the nearest target within `tolerance`, or left alone.
 *
 * This is the opposite case from `snapToRatio`: it runs on every pointer move
 * without being asked, so it must do nothing unless the user is already close
 * to an alignment they plausibly meant.
 */
export function snapToNearestTarget(
  value: number,
  targets: readonly number[],
  tolerance: number,
): number {
  let best = value;
  let bestDistance = tolerance + 1;
  for (const target of targets) {
    const distance = Math.abs(target - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = target;
    }
  }
  return bestDistance <= tolerance ? best : value;
}

/**
 * How a pair of adjacent panels divides its combined track after the divider
 * between them moves by `delta`.
 *
 * The pair's total is conserved — a splitter moves a boundary, it does not
 * resize the container — and each side keeps at least `minSize`, so a divider
 * dragged to the end leaves a grabbable sliver instead of a panel of zero width
 * that can never be dragged back.
 */
export function resizePair(
  beforeSize: number,
  afterSize: number,
  delta: number,
  minSize: number,
  snap = false,
): { before: number; after: number } {
  const total = beforeSize + afterSize;
  let before = Math.min(Math.max(beforeSize + delta, minSize), total - minSize);
  if (snap) {
    before = snapToRatio(before, total);
  }
  return { before, after: total - before };
}

/**
 * One splitter track after the divider at `index` moves by `delta`: the pixel
 * sizes to push into the splitter and the weights they normalize to.
 *
 * This is the pair rule applied to a whole track, which is what a corner
 * (intersection) drag needs — it moves one divider in each of several
 * splitters at once, and each must keep the panels it does not touch exactly
 * as they were.
 *
 * `null` means there is nothing to move: no divider at `index`, or a track
 * with no measured size (every panel reads zero, as in a frame before layout). There is nothing to redistribute then, and writing
 * anything would be worse than writing nothing: normalizing a zero total used
 * to wipe the stored weights to `[]`, and the pair rule on a zero track yields
 * negative pixel sizes.
 */
export function resizeTrackPair(
  initialSizes: readonly number[],
  index: number,
  delta: number,
  minSize: number,
  snap = false,
): { pixels: number[]; weights: number[] } | null {
  // No divider sits at `index` unless there is a panel on each side of it.
  if (index < 0 || index + 1 >= initialSizes.length) return null;
  const total = initialSizes.reduce((sum, size) => sum + size, 0);
  if (!(total > 0)) return null;
  const { before, after } = resizePair(initialSizes[index], initialSizes[index + 1], delta, minSize, snap);
  const pixels = initialSizes.map((size, i) =>
    i === index ? before : i === index + 1 ? after : size,
  );
  return { pixels, weights: pixels.map((size) => size / total) };
}

/** The numbers of a measured rect that the corner-snap rule reads. */
export interface SnapRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * A splitter divider as the snap rule sees it. `direction` is the SPLITTER's
 * flow: a `horizontal` split lays its children left to right, so its dividers
 * are vertical bars, and vice versa.
 */
export interface SnapDivider {
  direction: 'horizontal' | 'vertical' | undefined;
  rect: SnapRect;
}

/**
 * The lines a corner drag should snap to, relative to `origin`.
 *
 * A corner sits where a vertical and a horizontal divider cross, at
 * (`center.x`, `center.y`). Any OTHER vertical bar that the corner's horizontal
 * line passes through is somewhere the corner could line up with, so its
 * centre becomes an x target; symmetrically for y. Bars the line misses belong
 * to an unrelated region of the layout and are ignored — snapping to them would
 * pull the corner towards something the user cannot see it aligning with.
 *
 * A missing coordinate (the corner has no divider on that axis) contributes no
 * targets on the other axis.
 */
export function collectCornerSnapTargets(
  center: { x: number | null; y: number | null },
  dividers: readonly SnapDivider[],
  origin: { left: number; top: number },
): { x: number[]; y: number[] } {
  const { x: centerX, y: centerY } = center;
  const x =
    centerY === null
      ? []
      : dividers
          .filter(
            ({ direction, rect }) =>
              direction === 'horizontal' && centerY >= rect.top && centerY <= rect.bottom,
          )
          .map(({ rect }) => rect.left + rect.width / 2 - origin.left);
  const y =
    centerX === null
      ? []
      : dividers
          .filter(
            ({ direction, rect }) =>
              direction === 'vertical' && centerX >= rect.left && centerX <= rect.right,
          )
          .map(({ rect }) => rect.top + rect.height / 2 - origin.top);
  return { x, y };
}

/**
 * Where a dragged tab would land in a header, given the horizontal midpoint of
 * each tab that is a candidate target.
 *
 * `draggedCenter` is the midpoint of the placeholder currently occupying the
 * strip, and the bias it triggers is the fix for a real flicker: without it, a
 * tab dragged rightwards reaches the next tab's midpoint while the placeholder
 * is still on the left of it, so the insert point oscillates between two values
 * over a couple of pixels. Nudging the midpoint of every tab *right* of the
 * placeholder outward adds the hysteresis that stops it.
 */
export function headerInsertIndex(
  midpoints: readonly number[],
  clientX: number,
  draggedCenter: number | null,
  rightBias = 12,
): number {
  for (let i = 0; i < midpoints.length; i += 1) {
    const isRightOfDragged = draggedCenter !== null ? midpoints[i] >= draggedCenter : false;
    const threshold = isRightOfDragged ? midpoints[i] + rightBias : midpoints[i];
    if (clientX < threshold) {
      return i;
    }
  }
  return midpoints.length;
}
