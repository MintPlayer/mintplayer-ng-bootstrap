import type { OverlayOriginX, OverlayOriginY, OverlayPosition } from './overlay-controller';

/** The parts of an anchor's bounding rect the placement reads. */
export interface AnchorBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
  /** Minimum distance kept between the panel and every viewport edge. */
  margin: number;
}

export interface Placement {
  left: number;
  top: number;
}

function anchorX(origin: OverlayOriginX, rect: AnchorBox, rtl: boolean): number {
  // In RTL, 'start' visually maps to the right edge of the anchor.
  if (origin === 'start') return rtl ? rect.right : rect.left;
  if (origin === 'end') return rtl ? rect.left : rect.right;
  return rect.left + rect.width / 2;
}

function anchorY(origin: OverlayOriginY, rect: AnchorBox): number {
  if (origin === 'top') return rect.top;
  if (origin === 'bottom') return rect.bottom;
  return rect.top + rect.height / 2;
}

/**
 * How far to shift the panel left so its (start | center | end) edge lands on
 * the anchor point. In RTL the panel's start is its right edge, so it mirrors.
 */
function panelXOffset(overlayX: OverlayOriginX, width: number, rtl: boolean): number {
  if (overlayX === 'start') return rtl ? -width : 0;
  if (overlayX === 'end') return rtl ? 0 : -width;
  return -width / 2;
}

function panelYOffset(overlayY: OverlayOriginY, height: number): number {
  if (overlayY === 'top') return 0;
  if (overlayY === 'bottom') return -height;
  return -height / 2;
}

/**
 * The (left, top) that aligns the candidate's panel corner with its anchor
 * corner, plus the candidate's pixel offsets.
 */
export function placeFor(
  candidate: OverlayPosition,
  anchor: AnchorBox,
  panel: PanelSize,
  rtl: boolean
): Placement {
  return {
    left:
      anchorX(candidate.originX, anchor, rtl) +
      panelXOffset(candidate.overlayX, panel.width, rtl) +
      (candidate.offsetX ?? 0),
    top:
      anchorY(candidate.originY, anchor) +
      panelYOffset(candidate.overlayY, panel.height) +
      (candidate.offsetY ?? 0),
  };
}

/** True when the placed panel lies wholly inside the viewport's margins. */
export function fitsInViewport(placed: Placement, panel: PanelSize, viewport: Viewport): boolean {
  const { width, height, margin } = viewport;
  return (
    placed.left >= margin &&
    placed.top >= margin &&
    placed.left + panel.width <= width - margin &&
    placed.top + panel.height <= height - margin
  );
}

/**
 * Push a placement back inside the viewport's margins. A panel larger than
 * the viewport pins to the start (top/left) margin.
 */
export function clampToViewport(placed: Placement, panel: PanelSize, viewport: Viewport): Placement {
  const { width, height, margin } = viewport;
  const clamp = (value: number, size: number, extent: number) =>
    Math.max(margin, value + size > extent - margin ? extent - size - margin : value);
  return {
    left: clamp(placed.left, panel.width, width),
    top: clamp(placed.top, panel.height, height),
  };
}

/** True when the anchor's rect lies entirely outside the viewport. */
export function isAnchorOffscreen(rect: AnchorBox, viewport: Pick<Viewport, 'width' | 'height'>): boolean {
  return rect.right < 0 || rect.bottom < 0 || rect.left > viewport.width || rect.top > viewport.height;
}

/**
 * Walk (anchor x position) pairs in order and take the first placement that
 * fits the viewport. When none fits, the last pair evaluated is the fallback.
 * Either way the placement is clamped into the viewport. Null when there are
 * no anchors or no positions to try.
 */
export function choosePlacement(
  anchors: readonly AnchorBox[],
  positions: readonly OverlayPosition[],
  panel: PanelSize,
  viewport: Viewport,
  rtl: boolean
): { anchorIndex: number; placement: Placement } | null {
  const pairs = anchors.flatMap((anchor, anchorIndex) =>
    positions.map((candidate) => ({ anchorIndex, placed: placeFor(candidate, anchor, panel, rtl) }))
  );
  const chosen = pairs.find((p) => fitsInViewport(p.placed, panel, viewport)) ?? pairs[pairs.length - 1];
  if (!chosen) return null;
  return { anchorIndex: chosen.anchorIndex, placement: clampToViewport(chosen.placed, panel, viewport) };
}
