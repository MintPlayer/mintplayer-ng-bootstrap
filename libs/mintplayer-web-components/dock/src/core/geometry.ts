import type { DockFloatingPaneBounds, DockFloatingStackLayout } from '../types/dock-layout';

/**
 * The arithmetic behind floating windows. Pulled out of the element because it
 * is the part of the dock that jsdom can never exercise through the DOM —
 * every rect there is zero — while being exactly the part where an off-by-one
 * puts a window half off-screen.
 */

/**
 * The bounds a floating window may actually occupy inside a host of the given
 * size: never wider or taller than the host, never past its right or bottom
 * edge, never at a negative offset.
 *
 * An unmeasured host (either dimension zero) returns the intent unchanged.
 * Clamping against zero would collapse every window to a point during the first
 * frame, before the ResizeObserver has reported a size — and the next render
 * clamps correctly anyway.
 */
export function clampBoundsToHost(
  intent: DockFloatingPaneBounds,
  host: { width: number; height: number },
): DockFloatingPaneBounds {
  if (host.width <= 0 || host.height <= 0) return intent;
  const width = Math.min(intent.width, host.width);
  const height = Math.min(intent.height, host.height);
  const left = Math.min(Math.max(intent.left, 0), host.width - width);
  const top = Math.min(Math.max(intent.top, 0), host.height - height);
  return { left, top, width, height };
}

/** Hit test, edges inclusive. */
export function isPointWithinBounds(
  bounds: { left: number; right: number; top: number; bottom: number },
  x: number,
  y: number,
): boolean {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

/**
 * Stacking order for floating window `index`.
 *
 * A consumer-supplied `zIndex` wins so an app can pin a window above the rest;
 * otherwise later windows sit above earlier ones. A non-finite override falls
 * back rather than producing a `z-index: NaN` that the browser drops silently.
 */
export function floatingZIndex(
  floating: DockFloatingStackLayout | undefined,
  index: number,
): number {
  if (!floating) {
    return 10 + index;
  }
  return typeof floating.zIndex === 'number' && Number.isFinite(floating.zIndex)
    ? floating.zIndex
    : 10 + index;
}
