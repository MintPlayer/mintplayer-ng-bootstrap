import type { GridRect } from '../types/grid-rect';
import type { TilePosition } from '../types/tile-position';

/**
 * Pure grid geometry for `mp-tile-manager`'s pointer gestures. Everything here
 * takes plain numbers, so the snapping maths is testable without a layout
 * engine; the element only reads the rects and hands the numbers over.
 */

/** Cached per-cell layout metrics, in CSS pixels. */
export interface CellMetrics {
  width: number;
  height: number;
  gapX: number;
  gapY: number;
}

export interface GridPoint {
  x: number;
  y: number;
}

/** Inputs shared by the drag helpers: where the pointer is, relative to what. */
export interface DragPointer {
  /** Pointer position in viewport coordinates. */
  pointer: GridPoint;
  /** The grid's top-left corner in viewport coordinates. */
  gridOrigin: GridPoint;
  /** Where on the tile the pointer grabbed it, relative to the tile's top-left. */
  pointerOffset: GridPoint;
}

/**
 * The distance from one track start to the next. Null when the cell has no
 * usable size (the grid is not laid out yet, is `display: none`, or is
 * detached) — dividing by it would turn every snap into NaN or Infinity.
 */
function cellPitch(cell: CellMetrics): GridPoint | null {
  const x = cell.width + cell.gapX;
  const y = cell.height + cell.gapY;
  if (!(x > 0) || !(y > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/** Grid-relative top-left pixel of the cell a tile starts in. */
export function cellOrigin(position: Pick<TilePosition, 'colStart' | 'rowStart'>, cell: CellMetrics): GridPoint {
  return {
    x: (position.colStart - 1) * (cell.width + cell.gapX),
    y: (position.rowStart - 1) * (cell.height + cell.gapY),
  };
}

/** Where the grabbed tile's top-left would sit if it followed the pointer freely. */
function desiredTopLeft({ pointer, gridOrigin, pointerOffset }: DragPointer): GridPoint {
  return {
    x: pointer.x - gridOrigin.x - pointerOffset.x,
    y: pointer.y - gridOrigin.y - pointerOffset.y,
  };
}

/**
 * Snap a dragged tile to the nearest cell. The column is clamped so the whole
 * span stays inside `cols`; the row is only clamped at the top (the grid grows
 * downwards). Returns null when the cell has no size, so the gesture keeps its
 * last valid target instead of handing NaN to the packer.
 */
export function pointerToGridRect(
  drag: DragPointer,
  span: Pick<TilePosition, 'colSpan' | 'rowSpan'>,
  cell: CellMetrics,
  cols: number,
): GridRect | null {
  const pitch = cellPitch(cell);
  if (!pitch) return null;
  const local = desiredTopLeft(drag);
  const colStart = Math.round(local.x / pitch.x) + 1;
  const rowStart = Math.round(local.y / pitch.y) + 1;
  return {
    colStart: Math.max(1, Math.min(colStart, cols - span.colSpan + 1)),
    rowStart: Math.max(1, rowStart),
    colSpan: span.colSpan,
    rowSpan: span.rowSpan,
  };
}

/**
 * The visual offset of a dragged tile from its snapped cell, so the tile
 * tracks the pointer between snaps. Rounded to whole pixels.
 */
export function dragTranslate(drag: DragPointer, snapped: GridRect, cell: CellMetrics): GridPoint {
  const desired = desiredTopLeft(drag);
  const origin = cellOrigin(snapped, cell);
  return { x: Math.round(desired.x - origin.x), y: Math.round(desired.y - origin.y) };
}

export type ResizeHandle = 'side' | 'bottom' | 'corner';

/**
 * Spans for a resize gesture: the pointer delta since pointerdown, snapped to
 * whole cells. The side handle changes only columns, the bottom handle only
 * rows. Columns are clamped so the tile never crosses the last column. Null
 * when the cell has no size (same reason as pointerToGridRect).
 */
export function resizeSpans(
  delta: GridPoint,
  handle: ResizeHandle,
  startSpans: Pick<TilePosition, 'colSpan' | 'rowSpan'>,
  colStart: number,
  cell: CellMetrics,
  cols: number,
): Pick<TilePosition, 'colSpan' | 'rowSpan'> | null {
  const pitch = cellPitch(cell);
  if (!pitch) return null;
  const colDelta = Math.round(delta.x / pitch.x);
  const rowDelta = Math.round(delta.y / pitch.y);
  return {
    colSpan:
      handle === 'bottom'
        ? startSpans.colSpan
        : Math.max(1, Math.min(startSpans.colSpan + colDelta, cols - colStart + 1)),
    rowSpan: handle === 'side' ? startSpans.rowSpan : Math.max(1, startSpans.rowSpan + rowDelta),
  };
}
