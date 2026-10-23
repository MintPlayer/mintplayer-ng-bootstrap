/**
 * Every string the tile manager speaks or renders (PRD §6). Fronts accept a
 * partial override for localization; the machine and connect() read only from here.
 */
export interface TileManagerMessages {
  /** Accessible name of a tile without a `label`. */
  tileFallbackLabel(row: number, column: number): string;
  enterMoveMode(canResize: boolean): string;
  enterResizeMode(canMove: boolean): string;
  position(column: number, columns: number, row: number): string;
  size(colSpan: number, rowSpan: number): string;
  alreadyInRow(row: number): string;
  alreadyInColumn(column: number): string;
  minimumSize: string;
  maximumWidth(columns: number): string;
  moveBlocked: string;
  resizeBlocked: string;
  cannotMove: string;
  cannotResize: string;
  committed: string;
  cancelled: string;
  dragging(label: string): string;
  resizing(label: string): string;
  gestureBlocked: string;
  movedTo(row: number, column: number): string;
  resizedTo(colSpan: number, rowSpan: number): string;
  columnCount(columns: number): string;
}

export const DEFAULT_TILE_MANAGER_MESSAGES: TileManagerMessages = {
  tileFallbackLabel: (row, column) => `tile at row ${row}, column ${column}`,
  enterMoveMode: (canResize) =>
    canResize
      ? 'Move mode. Arrow keys move, Shift with arrow keys resizes, R switches to resizing, Enter commits, Escape cancels.'
      : 'Move mode. Arrow keys move, Enter commits, Escape cancels.',
  enterResizeMode: (canMove) =>
    canMove
      ? 'Resize mode. Arrow keys resize, M switches to moving, Enter commits, Escape cancels.'
      : 'Resize mode. Arrow keys resize, Enter commits, Escape cancels.',
  position: (column, columns, row) => `Column ${column} of ${columns}, row ${row}.`,
  size: (colSpan, rowSpan) => `${colSpan} ${colSpan === 1 ? 'column' : 'columns'} by ${rowSpan} ${rowSpan === 1 ? 'row' : 'rows'}.`,
  alreadyInRow: (row) => `Already in row ${row}.`,
  alreadyInColumn: (column) => `Already in column ${column}.`,
  minimumSize: 'Already at the smallest size.',
  maximumWidth: (columns) => `Already ${columns} ${columns === 1 ? 'column' : 'columns'} wide.`,
  moveBlocked: 'Move blocked.',
  resizeBlocked: 'Resize blocked by a locked tile.',
  cannotMove: 'This tile cannot be moved.',
  cannotResize: 'This tile cannot be resized.',
  committed: 'Change committed.',
  cancelled: 'Change cancelled and reverted.',
  dragging: (label) => `Dragging ${label}.`,
  resizing: (label) => `Resizing ${label}.`,
  gestureBlocked: 'Move blocked by a locked tile.',
  movedTo: (row, column) => `Tile moved to row ${row}, column ${column}.`,
  resizedTo: (colSpan, rowSpan) => `Tile resized to ${colSpan} ${colSpan === 1 ? 'column' : 'columns'} by ${rowSpan} ${rowSpan === 1 ? 'row' : 'rows'}.`,
  columnCount: (columns) => `Board now has ${columns} ${columns === 1 ? 'column' : 'columns'}.`,
};
