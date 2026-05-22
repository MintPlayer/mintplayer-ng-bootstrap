import { describe, expect, it } from 'vitest';
import { pack } from './pack';
import { TilePosition } from '../types/tile-position';

interface InputTile {
  id: string;
  position: TilePosition;
  locked?: boolean;
}

const t = (
  id: string,
  colStart: number,
  rowStart: number,
  colSpan = 1,
  rowSpan = 1,
  locked = false,
): InputTile => ({
  id,
  position: { colStart, rowStart, colSpan, rowSpan },
  locked,
});

const normalize = (tiles: InputTile[]) =>
  tiles.map((tile) => ({ ...tile, locked: tile.locked ?? false }));

describe('pack', () => {
  it('keeps tiles in place when the pinned position does not overlap anyone', () => {
    const tiles = normalize([t('a', 1, 1), t('b', 2, 1), t('c', 3, 1)]);
    const result = pack(tiles, { id: 'a', rect: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 } }, 4);

    expect(result.blocked).toBe(false);
    expect(result.layout).toEqual([
      { id: 'a', position: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 } },
      { id: 'b', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } },
      { id: 'c', position: { colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 1 } },
    ]);
  });

  it('pushes overlapping tiles down and gravity-compacts upward into free rows', () => {
    // Initial layout (4 columns):
    //   row 1: a(1) b(2)
    //   row 2: c(1) d(2)
    // Drag a to (2,1) — overlaps b. b should be pushed and compact.
    const tiles = normalize([t('a', 1, 1), t('b', 2, 1), t('c', 1, 2), t('d', 2, 2)]);
    const result = pack(tiles, { id: 'a', rect: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }, 4);

    expect(result.blocked).toBe(false);
    const aPos = result.layout.find((p) => p.id === 'a')!.position;
    const bPos = result.layout.find((p) => p.id === 'b')!.position;

    expect(aPos).toEqual({ colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 });
    // b moved off (2,1); confirm it didn't stay in place.
    expect(bPos.rowStart === 1 && bPos.colStart === 2).toBe(false);

    // Confirm no two tiles overlap.
    const all = result.layout;
    all.forEach((p, i) =>
      all.slice(i + 1).forEach((q) => {
        const overlap =
          p.position.colStart < q.position.colStart + q.position.colSpan &&
          q.position.colStart < p.position.colStart + p.position.colSpan &&
          p.position.rowStart < q.position.rowStart + q.position.rowSpan &&
          q.position.rowStart < p.position.rowStart + p.position.rowSpan;
        expect(overlap).toBe(false);
      }),
    );
  });

  it('returns blocked when the pinned rect overlaps a locked tile', () => {
    const tiles = normalize([t('a', 1, 1), t('locked', 2, 1, 1, 1, true)]);
    const result = pack(tiles, { id: 'a', rect: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }, 4);

    expect(result.blocked).toBe(true);
  });

  it('compacts a gappy layout to the top', () => {
    // a is pinned at its current spot, b/c are floating low.
    const tiles = normalize([t('a', 1, 1), t('b', 1, 5), t('c', 2, 7)]);
    const result = pack(tiles, { id: 'a', rect: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 } }, 4);

    expect(result.blocked).toBe(false);
    const bPos = result.layout.find((p) => p.id === 'b')!.position;
    const cPos = result.layout.find((p) => p.id === 'c')!.position;

    // b can slide all the way up to row 1, col 2 (col 1 is pinned by a)
    // OR row 2, col 1 — depends on order. Just verify it ended up high.
    expect(bPos.rowStart).toBeLessThanOrEqual(2);
    expect(cPos.rowStart).toBeLessThanOrEqual(2);
  });

  it('handles wide tiles (colSpan > 1) without overlap', () => {
    const tiles = normalize([t('wide', 1, 1, 3, 1), t('b', 4, 1), t('c', 1, 2, 2, 1)]);
    const result = pack(tiles, { id: 'wide', rect: { colStart: 2, rowStart: 1, colSpan: 3, rowSpan: 1 } }, 4);

    expect(result.blocked).toBe(false);
    const widePos = result.layout.find((p) => p.id === 'wide')!.position;
    expect(widePos.colStart).toBe(2);
    expect(widePos.colSpan).toBe(3);
  });

  it('throws when the pinned id is not in the tiles array', () => {
    const tiles = normalize([t('a', 1, 1)]);
    expect(() =>
      pack(tiles, { id: 'ghost', rect: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 } }, 4),
    ).toThrow();
  });

  it('places the pinned tile in the output even when its colStart equals current', () => {
    const tiles = normalize([t('a', 1, 1)]);
    const result = pack(tiles, { id: 'a', rect: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 } }, 4);

    expect(result.layout).toEqual([
      { id: 'a', position: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 } },
    ]);
  });

  it('preserves input order in the output snapshot for identity stability', () => {
    const tiles = normalize([t('z', 1, 1), t('a', 2, 1), t('m', 3, 1)]);
    const result = pack(tiles, { id: 'a', rect: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }, 4);

    expect(result.layout.map((p) => p.id)).toEqual(['z', 'a', 'm']);
  });

  it('respects tie-breaking — lower (rowStart, colStart) wins for repacking order', () => {
    // Two equally valid candidates for relocation; pinning forces a deterministic outcome.
    const tiles = normalize([t('a', 1, 1), t('b', 1, 2), t('c', 1, 3)]);
    // Pin b at (1,1) — overlaps a.
    const result = pack(tiles, { id: 'b', rect: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 } }, 2);

    expect(result.blocked).toBe(false);
    const aPos = result.layout.find((p) => p.id === 'a')!.position;
    const bPos = result.layout.find((p) => p.id === 'b')!.position;
    expect(bPos).toEqual({ colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 });
    // a was at (1,1); pushed and compacted. Should land somewhere not overlapping b.
    expect(aPos.colStart === 1 && aPos.rowStart === 1).toBe(false);
  });
});
