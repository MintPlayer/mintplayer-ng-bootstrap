export interface CanvasPoint {
  x: number;
  y: number;
}

/** The rendered box of the canvas, in CSS pixels (a DOMRect's relevant part). */
export interface RenderedBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Map a pointer position into canvas BITMAP coordinates.
 *
 * `offsetX/offsetY` are CSS pixels of the rendered box; when the canvas is
 * CSS-sized (e.g. `width: 100%`) those disagree with the `width`/`height`
 * drawing space and every stroke would land offset and stretched. Scaling by
 * bitmap-size / rendered-box keeps drawing correct under any CSS sizing.
 *
 * A box with no area (no layout yet, a hidden pad) cannot be scaled against,
 * so the offset coordinates are used as they are.
 */
export function toBitmapPoint(
  client: CanvasPoint,
  offset: CanvasPoint,
  box: RenderedBox,
  bitmap: { width: number; height: number },
): CanvasPoint {
  if (!box.width || !box.height) return { x: offset.x, y: offset.y };
  return {
    x: (client.x - box.left) * (bitmap.width / box.width),
    y: (client.y - box.top) * (bitmap.height / box.height),
  };
}
