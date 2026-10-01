import { describe, expect, it } from 'vitest';
import { cellOrigin, dragTranslate, pointerToGridRect, resizeSpans, type CellMetrics, type DragPointer } from './grid-geometry';

// 100x80 cells with an 8 px gap: one column pitch is 108 px, one row pitch 88 px.
const cell: CellMetrics = { width: 100, height: 80, gapX: 8, gapY: 8 };
const zero: CellMetrics = { width: 0, height: 0, gapX: 0, gapY: 0 };

/** A drag whose grid sits at (20, 10) and grabbed the tile 5 px in from its corner. */
const drag = (x: number, y: number): DragPointer => ({
  pointer: { x, y },
  gridOrigin: { x: 20, y: 10 },
  pointerOffset: { x: 5, y: 5 },
});
/** Pointer position that puts the tile's top-left exactly at grid-local (lx, ly). */
const at = (lx: number, ly: number) => drag(lx + 25, ly + 15);

const span11 = { colSpan: 1, rowSpan: 1 };

describe('cellOrigin', () => {
  it('is the grid-local top-left of a cell, counting gaps', () => {
    expect(cellOrigin({ colStart: 1, rowStart: 1 }, cell)).toEqual({ x: 0, y: 0 });
    expect(cellOrigin({ colStart: 3, rowStart: 2 }, cell)).toEqual({ x: 216, y: 88 });
  });
});

describe('pointerToGridRect', () => {
  it('snaps the tile to the cell its top-left is over', () => {
    expect(pointerToGridRect(at(216, 88), span11, cell, 4)).toEqual({ colStart: 3, rowStart: 2, ...span11 });
  });

  it('accounts for the grid origin and the grab offset', () => {
    // Pointer at (25, 15) with origin (20, 10) and offset (5, 5) is local (0, 0).
    expect(pointerToGridRect(drag(25, 15), span11, cell, 4)).toMatchObject({ colStart: 1, rowStart: 1 });
  });

  it('rounds to the nearest cell: just under half a pitch stays, half a pitch moves', () => {
    expect(pointerToGridRect(at(53, 43), span11, cell, 4)).toMatchObject({ colStart: 1, rowStart: 1 });
    expect(pointerToGridRect(at(54, 44), span11, cell, 4)).toMatchObject({ colStart: 2, rowStart: 2 });
  });

  it('keeps the whole span inside the last column', () => {
    const wide = { colSpan: 2, rowSpan: 1 };
    expect(pointerToGridRect(at(108 * 5, 0), wide, cell, 4)).toEqual({ colStart: 3, rowStart: 1, ...wide });
  });

  it('clamps at the first column and row when dragged past the top-left', () => {
    expect(pointerToGridRect(at(-500, -500), span11, cell, 4)).toMatchObject({ colStart: 1, rowStart: 1 });
  });

  it('lets the grid grow downwards without a row limit', () => {
    expect(pointerToGridRect(at(0, 88 * 40), span11, cell, 4)).toMatchObject({ rowStart: 41 });
  });

  it('preserves the dragged tile spans', () => {
    const big = { colSpan: 2, rowSpan: 3 };
    expect(pointerToGridRect(at(0, 0), big, cell, 4)).toMatchObject(big);
  });

  it('a span wider than the grid pins to column 1', () => {
    expect(pointerToGridRect(at(300, 0), { colSpan: 5, rowSpan: 1 }, cell, 4)).toMatchObject({ colStart: 1 });
  });

  it('snaps with no gap between cells', () => {
    const tight = { width: 50, height: 50, gapX: 0, gapY: 0 };
    expect(pointerToGridRect(at(100, 150), span11, tight, 4)).toMatchObject({ colStart: 3, rowStart: 4 });
  });

  it('returns null for a zero-size cell instead of a NaN or Infinity rect', () => {
    expect(pointerToGridRect(at(0, 0), span11, zero, 4)).toBeNull();
    expect(pointerToGridRect(at(300, 300), span11, zero, 4)).toBeNull();
  });

  it('returns null when only one axis has no size', () => {
    expect(pointerToGridRect(at(0, 0), span11, { ...cell, height: 0, gapY: 0 }, 4)).toBeNull();
    expect(pointerToGridRect(at(0, 0), span11, { ...cell, width: 0, gapX: 0 }, 4)).toBeNull();
  });

  it('returns null for non-finite metrics', () => {
    expect(pointerToGridRect(at(0, 0), span11, { ...cell, width: Number.NaN }, 4)).toBeNull();
    expect(pointerToGridRect(at(0, 0), span11, { ...cell, height: Number.POSITIVE_INFINITY }, 4)).toBeNull();
  });
});

describe('dragTranslate', () => {
  it('is zero when the tile sits exactly on its snapped cell', () => {
    expect(dragTranslate(at(216, 88), { colStart: 3, rowStart: 2, ...span11 }, cell)).toEqual({ x: 0, y: 0 });
  });

  it('is the offset between where the pointer holds the tile and the snapped cell', () => {
    expect(dragTranslate(at(240, 70), { colStart: 3, rowStart: 2, ...span11 }, cell)).toEqual({ x: 24, y: -18 });
  });

  it('rounds to whole pixels', () => {
    expect(dragTranslate(at(10.4, 10.6), { colStart: 1, rowStart: 1, ...span11 }, cell)).toEqual({ x: 10, y: 11 });
  });

  it('with a zero-size cell the tile simply follows the pointer', () => {
    expect(dragTranslate(at(30, 40), { colStart: 1, rowStart: 1, ...span11 }, zero)).toEqual({ x: 30, y: 40 });
  });
});

describe('resizeSpans', () => {
  it('the corner handle grows both spans by whole cells', () => {
    expect(resizeSpans({ x: 108, y: 176 }, 'corner', span11, 1, cell, 4)).toEqual({ colSpan: 2, rowSpan: 3 });
  });

  it('the side handle changes only the column span', () => {
    expect(resizeSpans({ x: 108, y: 176 }, 'side', span11, 1, cell, 4)).toEqual({ colSpan: 2, rowSpan: 1 });
  });

  it('the bottom handle changes only the row span', () => {
    expect(resizeSpans({ x: 108, y: 176 }, 'bottom', span11, 1, cell, 4)).toEqual({ colSpan: 1, rowSpan: 3 });
  });

  it('rounds to the nearest cell', () => {
    expect(resizeSpans({ x: 53, y: 43 }, 'corner', span11, 1, cell, 4)).toEqual({ colSpan: 1, rowSpan: 1 });
    expect(resizeSpans({ x: 54, y: 44 }, 'corner', span11, 1, cell, 4)).toEqual({ colSpan: 2, rowSpan: 2 });
  });

  it('never shrinks below one cell', () => {
    expect(resizeSpans({ x: -1000, y: -1000 }, 'corner', { colSpan: 2, rowSpan: 2 }, 1, cell, 4)).toEqual({
      colSpan: 1,
      rowSpan: 1,
    });
  });

  it('never grows past the last column, measured from where the tile starts', () => {
    expect(resizeSpans({ x: 1000, y: 0 }, 'side', span11, 3, cell, 4)).toEqual({ colSpan: 2, rowSpan: 1 });
  });

  it('returns null for a zero-size cell instead of NaN spans', () => {
    expect(resizeSpans({ x: 0, y: 0 }, 'corner', span11, 1, zero, 4)).toBeNull();
    expect(resizeSpans({ x: 50, y: 50 }, 'side', span11, 1, zero, 4)).toBeNull();
  });
});
