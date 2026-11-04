/**
 * The resizable's geometry (#458 M7), moved unchanged from the Angular glyph directive: pure
 * functions from a captured resize action and a pointer position to the box's new size,
 * offset and margins. No DOM.
 */

/** How the box takes part in layout: in the flow (`inline`) or positioned (`absolute`). */
export type ResizablePositioning = 'absolute' | 'inline';

/** A glyph's LOGICAL edge: `start`/`end` follow the text direction. */
export type ResizeEdge = 'top' | 'end' | 'bottom' | 'start';

/** A physical edge of the box, after `start`/`end` are resolved against the text direction. */
export type PhysicalSide = 'top' | 'bottom' | 'left' | 'right';

/** The geometry captured when a resize begins; every move is computed from it. */
export interface ResizeAction {
  readonly positioning: ResizablePositioning;
  /** The physical edges the active glyph drags. */
  readonly sides: readonly PhysicalSide[];
  /** The box's viewport rect at the start of the resize. */
  readonly rect: { left: number; top: number; width: number; height: number };
  /** The box's offsetLeft/offsetTop: its position in its containing block. */
  readonly offset: { left: number; top: number };
  /** The box's computed margins, in px. */
  readonly margin: { left: number; right: number; top: number; bottom: number };
}

/** Smallest size, in px, a drag or a key press can shrink the box to. */
export const MIN_RESIZE_SIZE = 10;

/** The box's written geometry, in px. Absent keys are left unchanged. */
export interface ResizeUpdate {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
}

/**
 * Maps a glyph's logical edges onto the physical sides of the box. In a right-to-left
 * document the start edge is the right one, so a `start` glyph sits on, drags and is
 * announced as the right edge.
 */
export function toPhysicalSides(edges: readonly ResizeEdge[], rtl: boolean): PhysicalSide[] {
  return edges.map((edge): PhysicalSide => {
    switch (edge) {
      case 'start': return rtl ? 'right' : 'left';
      case 'end': return rtl ? 'left' : 'right';
      default: return edge;
    }
  });
}

/**
 * The size and margin changes for a pointer at (x, y), given the geometry captured when the
 * resize began. The captured values are used rather than the live rect: reading the rect on
 * every move feeds back when content inside the box relayouts in response to its width.
 *
 * - Inline positioning keeps the surrounding layout still: the box grows horizontally by
 *   giving back margin, and vertically by trading height for margin.
 * - Absolute positioning writes the box itself. `left`/`top` are in the containing block's
 *   coordinates, so the pointer delta is applied to the captured offset, never the viewport
 *   coordinate itself (which is off by the page scroll and the containing block's position).
 */
export function dragResize(action: ResizeAction, x: number, y: number): ResizeUpdate {
  const { rect, offset, margin, sides, positioning } = action;
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const inline = positioning === 'inline';

  const horizontal = ((): ResizeUpdate => {
    if (sides.includes('right')) {
      const px = Math.max(x, rect.left + MIN_RESIZE_SIZE);
      return inline
        ? { marginRight: margin.right + (right - px) }
        : { width: px - rect.left };
    }
    if (sides.includes('left')) {
      const px = Math.min(x, right - MIN_RESIZE_SIZE);
      return inline
        ? { marginLeft: margin.left + (px - rect.left) }
        : { left: offset.left + (px - rect.left), width: right - px };
    }
    return {};
  })();

  const vertical = ((): ResizeUpdate => {
    if (sides.includes('bottom')) {
      const py = Math.max(y, rect.top + MIN_RESIZE_SIZE);
      return inline
        ? { height: py - rect.top, marginBottom: margin.bottom + (bottom - py) }
        : { height: py - rect.top };
    }
    if (sides.includes('top')) {
      const py = Math.min(y, bottom - MIN_RESIZE_SIZE);
      return inline
        ? { height: bottom - py, marginTop: margin.top + (py - rect.top) }
        : { top: offset.top + (py - rect.top), height: bottom - py };
    }
    return {};
  })();

  return { ...horizontal, ...vertical };
}

/**
 * The pointer position a key press is equivalent to: the dragged edge moved by `step` in the
 * arrow's direction. A key press is then exactly a one-step drag, so it moves the same edge a
 * drag would (never the opposite one) and writes the same geometry in both positioning modes.
 * Returns null for a key the glyph does not handle.
 */
export function keyboardResizePoint(action: ResizeAction, key: string, step: number): { x: number; y: number } | null {
  const { rect, sides } = action;
  const hEdge = sides.includes('right') ? rect.left + rect.width
    : sides.includes('left') ? rect.left
    : null;
  const vEdge = sides.includes('bottom') ? rect.top + rect.height
    : sides.includes('top') ? rect.top
    : null;
  // A coordinate on an axis the glyph does not resize is ignored by dragResize.
  const x = hEdge ?? 0;
  const y = vEdge ?? 0;
  switch (key) {
    case 'ArrowRight': return hEdge === null ? null : { x: x + step, y };
    case 'ArrowLeft': return hEdge === null ? null : { x: x - step, y };
    case 'ArrowDown': return vEdge === null ? null : { x, y: y + step };
    case 'ArrowUp': return vEdge === null ? null : { x, y: y - step };
    default: return null;
  }
}
