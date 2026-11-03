/**
 * Placement beside an anchor for the tooltip and the popover (#458 M6): the
 * panel sits on the requested side of its anchor, centred on it, and flips to
 * the opposite side when it does not fit. The position is written as custom
 * properties the group's sheet consumes, so no template binding fights it:
 *
 *   .tooltip { position: fixed; inset: auto; margin: 0;
 *              left: var(--mp-anchored-left); top: var(--mp-anchored-top); }
 *
 * `start` and `end` are logical: in a right-to-left anchor, `start` is its right.
 */
import { clampToViewport, fitsInViewport, placeFor, type AnchorBox, type PanelSize, type Viewport } from './placement';
import type { OverlayPosition } from './types';

export type AnchorSide = 'top' | 'bottom' | 'start' | 'end';

export const ANCHOR_SIDES: readonly AnchorSide[] = ['top', 'bottom', 'start', 'end'];

const OPPOSITE: Record<AnchorSide, AnchorSide> = { top: 'bottom', bottom: 'top', start: 'end', end: 'start' };

/** A side as a corner pairing, `gap` pixels away from the anchor. */
function sidePosition(side: AnchorSide, gap: number): OverlayPosition {
  switch (side) {
    case 'top':
      return { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -gap };
    case 'start':
      return { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: 0 };
    case 'end':
      return { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 0 };
    default:
      return { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: gap };
  }
}

/** An unknown side (a typo, a stale value) falls back to `fallback`. */
export const anchorSide = (side: unknown, fallback: AnchorSide): AnchorSide => (ANCHOR_SIDES.includes(side as AnchorSide) ? (side as AnchorSide) : fallback);

/**
 * The side and the position of a panel beside an anchor: the requested side
 * when it fits, else the opposite one when that does, else the requested side
 * pushed back into the viewport.
 */
export function besidePlacement(
  anchor: AnchorBox,
  panel: PanelSize,
  viewport: Viewport,
  side: AnchorSide,
  gap: number,
  rtl: boolean,
): { side: AnchorSide; left: number; top: number } {
  const at = (s: AnchorSide) => {
    const position = sidePosition(s, gap);
    // A horizontal gap is physical: away from the anchor on the side the panel lands.
    const physicalLeft = (s === 'start') !== rtl;
    const offsetX = s === 'start' || s === 'end' ? (physicalLeft ? -gap : gap) : 0;
    return placeFor({ ...position, offsetX }, anchor, panel, rtl);
  };
  const order = [side, OPPOSITE[side]];
  const chosen = order.find((s) => fitsInViewport(at(s), panel, viewport)) ?? side;
  const placed = clampToViewport(at(chosen), panel, viewport);
  return { side: chosen, left: Math.round(placed.left), top: Math.round(placed.top) };
}

/** Place `panel` beside `anchor` from their current boxes; returns the side it landed on. */
export function placeBeside(anchor: Element, panel: HTMLElement, side: AnchorSide, gap: number, margin = 8): AnchorSide {
  const view = panel.ownerDocument.defaultView;
  if (!view) return side;
  const rect = anchor.getBoundingClientRect();
  const size = panel.getBoundingClientRect();
  const rtl = view.getComputedStyle(anchor).direction === 'rtl';
  const placed = besidePlacement(rect, { width: size.width, height: size.height }, { width: view.innerWidth, height: view.innerHeight, margin }, side, gap, rtl);
  panel.style.setProperty('--mp-anchored-left', `${placed.left}px`);
  panel.style.setProperty('--mp-anchored-top', `${placed.top}px`);
  return placed.side;
}

/**
 * Run `place` again whenever the panel could have moved off its anchor: a
 * scroll anywhere (captured), a resize, or the panel changing size. Batched
 * per frame. Returns the cleanup.
 */
export function trackBeside(panel: HTMLElement, place: () => void): () => void {
  const view = panel.ownerDocument.defaultView;
  if (!view) return () => undefined;
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = view.requestAnimationFrame(() => ((frame = 0), place()));
  };
  const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
  resized?.observe(panel);
  view.addEventListener('scroll', schedule, true);
  view.addEventListener('resize', schedule);
  return () => {
    resized?.disconnect();
    view.removeEventListener('scroll', schedule, true);
    view.removeEventListener('resize', schedule);
    if (frame) view.cancelAnimationFrame(frame);
  };
}
