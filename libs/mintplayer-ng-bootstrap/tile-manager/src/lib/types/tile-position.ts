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
