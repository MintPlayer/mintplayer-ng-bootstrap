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
