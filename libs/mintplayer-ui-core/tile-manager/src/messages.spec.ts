import { DEFAULT_TILE_MANAGER_MESSAGES as m } from './messages';

describe('tile manager messages', () => {
  it('describe the board and each tile’s commands', () => {
    expect([m.boardDescription(null, true), m.boardDescription(1, false), m.boardDescription(4, true)])
      .toEqual(['Read-only.', '1 column.', '4 columns, read-only.']);
    expect([m.instructions(true, true), m.instructions(true, false), m.instructions(false, true), m.instructions(false, false)].map((s) => s.slice(0, 12)))
      .toEqual(['Press M to m', 'Press M to m', 'Press R to r', 'This tile ca']);
    expect(m.enterResizeMode(true)).toContain('M switches');
    expect(m.enterResizeMode(false)).not.toContain('M switches');
  });

  it('pluralise sizes and counts', () => {
    expect([m.size(1, 1), m.size(2, 3)]).toEqual(['1 column by 1 row.', '2 columns by 3 rows.']);
    expect([m.maximumWidth(1), m.maximumWidth(6)]).toEqual(['Already 1 column wide.', 'Already 6 columns wide.']);
    expect([m.resizedTo(1, 2), m.resizedTo(3, 1)]).toEqual(['Tile resized to 1 column by 2 rows.', 'Tile resized to 3 columns by 1 row.']);
    expect([m.columnCount(1), m.columnCount(2)]).toEqual(['Board now has 1 column.', 'Board now has 2 columns.']);
  });

  it('name positions and gestures', () => {
    expect(m.position(2, 4, 3)).toBe('Column 2 of 4, row 3.');
    expect([m.alreadyInRow(1), m.alreadyInColumn(2), m.dragging('A'), m.resizing('B'), m.movedTo(1, 2)])
      .toEqual(['Already in row 1.', 'Already in column 2.', 'Dragging A.', 'Resizing B.', 'Tile moved to row 1, column 2.']);
  });
});
