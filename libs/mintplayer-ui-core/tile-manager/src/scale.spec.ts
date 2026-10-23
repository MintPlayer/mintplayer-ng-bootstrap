import { scaleEdges } from './scale';
import type { TileLayoutSnapshot } from './types';
import { rectsOverlap } from './types';

const at = (id: string, colStart: number, colSpan: number, rowStart = 1, rowSpan = 1) => ({ id, position: { colStart, rowStart, colSpan, rowSpan } });

// A full 6-column row of 1-, 2- and 3-wide tiles, plus a tall one below.
const six: TileLayoutSnapshot = [at('a', 1, 1), at('b', 2, 2), at('c', 4, 3), at('d', 1, 6, 2, 2)];

describe('scaleEdges', () => {
  it('keeps touching tiles touching and fills the new width', () => {
    const eight = scaleEdges(six, 6, 8);
    const row = eight.filter((e) => e.position.rowStart === 1).sort((x, y) => x.position.colStart - y.position.colStart);
    row.reduce((end, e) => {
      expect(e.position.colStart).toBe(end + 1);
      return e.position.colStart + e.position.colSpan - 1;
    }, 0);
    const last = row[row.length - 1].position;
    expect(last.colStart + last.colSpan - 1).toBe(8);
    expect(eight.find((e) => e.id === 'd')!.position).toEqual({ colStart: 1, rowStart: 2, colSpan: 8, rowSpan: 2 });
  });

  it('creates no overlaps and keeps every span at least 1', () => {
    const scaled = scaleEdges(six, 6, 7);
    scaled.forEach((a, i) => {
      expect(a.position.colSpan).toBeGreaterThanOrEqual(1);
      scaled.slice(i + 1).forEach((b) => expect(rectsOverlap(a.position, b.position)).toBe(false));
    });
  });

  it('round-trips 6 → 8 → 6', () => {
    expect(scaleEdges(scaleEdges(six, 6, 8), 8, 6)).toEqual(six);
  });

  it('leaves rows unchanged', () => {
    expect(scaleEdges(six, 2, 5).map((e) => [e.position.rowStart, e.position.rowSpan])).toEqual(six.map((e) => [e.position.rowStart, e.position.rowSpan]));
  });
});
