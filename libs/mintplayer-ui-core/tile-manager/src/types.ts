/**
 * Grid placement of a single tile, in CSS Grid 1-based coordinates.
 * `colStart` / `rowStart` are inclusive; `colSpan` / `rowSpan` are counts of cells.
 */
export interface TilePosition {
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
}

/**
 * Half-open rectangle in grid coordinates: `[colStart, colStart + colSpan) × [rowStart, rowStart + rowSpan)`.
 * Same shape as `TilePosition` but used internally for overlap math; kept
 * as its own type so call-sites read clearly.
 */
export interface GridRect {
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
}

export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return (
    a.colStart < b.colStart + b.colSpan &&
    b.colStart < a.colStart + a.colSpan &&
    a.rowStart < b.rowStart + b.rowSpan &&
    b.rowStart < a.rowStart + a.rowSpan
  );
}


/**
 * Stable, JSON-serializable snapshot of the manager's layout.
 * One entry per tile, keyed by stable id. Host apps `JSON.stringify`
 * this for persistence and project it back into per-tile `position`
 * inputs to restore.
 */
export type TileLayoutSnapshot = Array<{
  id: string;
  position: TilePosition;
}>;

export interface TileGestureBlocked {
  id: string;
  reason: 'locked-overlap' | 'no-valid-layout';
}
