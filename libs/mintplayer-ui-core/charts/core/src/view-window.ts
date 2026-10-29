/**
 * Geometric view window over normalized content coordinates ([0, 1] on both
 * axes). `zoom` is the magnification (1 = fitted); `x`/`y` are the content
 * coordinates of the window's top-left corner. Pure number-in/number-out, so
 * the pointer and pinch maths is testable without a layout box.
 */
export interface ViewWindow {
  zoom: number;
  x: number;
  y: number;
}

export const FITTED_VIEW: ViewWindow = Object.freeze({ zoom: 1, x: 0, y: 0 });

/** Keep the window inside the content: an offset in [0, 1 - 1/zoom]. */
export function clampViewOffset(value: number, zoom: number): number {
  return Math.min(1 - 1 / zoom, Math.max(0, value));
}

/**
 * Re-zoom around an anchor given as a fraction of the visible chart: the
 * content point under the anchor stays under the anchor. The zoom is clamped
 * to [1, maxZoom]; a non-numeric zoom resolves to 1.
 */
export function zoomViewAt(
  view: ViewWindow,
  zoom: number,
  anchorX: number,
  anchorY: number,
  maxZoom: number,
): ViewWindow {
  const next = Math.min(maxZoom, Math.max(1, Number(zoom) || 1));
  const contentX = view.x + anchorX / view.zoom;
  const contentY = view.y + anchorY / view.zoom;
  return {
    zoom: next,
    x: clampViewOffset(contentX - anchorX / next, next),
    y: clampViewOffset(contentY - anchorY / next, next),
  };
}

/**
 * Pan by fractions of the visible chart (drag / two-finger move): content
 * follows the pointer, so a positive delta moves the window backwards. A
 * fitted view has nothing to pan and is returned unchanged.
 */
export function panView(view: ViewWindow, dxFraction: number, dyFraction: number): ViewWindow {
  if (view.zoom <= 1) return view;
  return {
    zoom: view.zoom,
    x: clampViewOffset(view.x - dxFraction / view.zoom, view.zoom),
    y: clampViewOffset(view.y - dyFraction / view.zoom, view.zoom),
  };
}

/** Map a normalized content rect through the window to visible-chart fractions. */
export function projectRect(
  view: ViewWindow,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x0: number; y0: number; x1: number; y1: number } {
  return {
    x0: (x0 - view.x) * view.zoom,
    y0: (y0 - view.y) * view.zoom,
    x1: (x1 - view.x) * view.zoom,
    y1: (y1 - view.y) * view.zoom,
  };
}

/**
 * A client point as clamped fractions of a box. A box without area (not laid
 * out, or detached) has no meaningful fraction, so the centre is returned.
 */
export function pointFraction(
  box: { left: number; top: number; width: number; height: number } | undefined,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  if (!box || !box.width || !box.height) return { x: 0.5, y: 0.5 };
  return {
    x: Math.min(1, Math.max(0, (clientX - box.left) / box.width)),
    y: Math.min(1, Math.max(0, (clientY - box.top) / box.height)),
  };
}
