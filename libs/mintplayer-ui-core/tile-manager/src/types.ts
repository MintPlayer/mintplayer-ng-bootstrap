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

/** A span without a placement: `defaultSize` on a tile, and the size of an appended tile (D8). */
export interface TileSize {
  colSpan: number;
  rowSpan: number;
}

/** Identity and options of one tile. Positions live in `TileLayouts`, never on the tile (D4). */
export interface MintTile {
  id: string;
  disableMove?: boolean;
  disableResize?: boolean;
  label?: string | null;
  /** Size used when no layout places this tile (D5 step 4, D8). Defaults to 1×1, capped to the column count. */
  defaultSize?: TileSize;
}

/** `minWidth` is in px of the board's content box. The entry with the largest `minWidth ≤ width` applies (D1). */
export interface TileBreakpoint {
  minWidth: number;
  columns: number;
}

/** Stored layouts, keyed by column count (D4). A missing count is derived, never stored (D5). */
export type TileLayouts = Readonly<Record<number, TileLayoutSnapshot>>;

export interface TileGestureBlocked {
  id: string;
  reason: 'locked-overlap' | 'no-valid-layout';
}
