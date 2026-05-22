import { TilePosition } from '../types/tile-position';
import { TileLayoutSnapshot } from '../types/tile-layout-snapshot';
import { GridRect, rectsOverlap } from '../types/grid-rect';
interface PackInputTile {
  id: string;
  position: TilePosition;
  locked: boolean;
}

interface Placement {
  id: string;
  position: TilePosition;
}

/**
 * Vertical-compact packer. The pinned tile's rect is the user's gesture; all
 * other tiles flow around it (locked tiles stay put; movable tiles get pushed
 * out of the way and gravity-compacted upward).
 *
 * Returns `blocked: true` if the pinned rect overlaps a locked tile or no
 * valid layout exists; the caller should snap back and not commit.
 */
export function pack(
  tiles: ReadonlyArray<PackInputTile>,
  pinned: { id: string; rect: GridRect },
  columnCount: number,
): { layout: TileLayoutSnapshot; blocked: boolean } {
  const pinnedTile = tiles.find((t) => t.id === pinned.id);
  if (!pinnedTile) {
    throw new Error(`pack: pinned tile "${pinned.id}" is not in the tiles array`);
  }

  const pinnedPlacement: Placement = { id: pinned.id, position: { ...pinned.rect } };

  const lockedPlacements: ReadonlyArray<Placement> = tiles
    .filter((t) => t.locked && t.id !== pinned.id)
    .map((t) => ({ id: t.id, position: { ...t.position } }));

  const lockedOverlap = lockedPlacements.some((l) =>
    rectsOverlap(l.position, pinnedPlacement.position),
  );
  if (lockedOverlap) {
    return { layout: snapshotFromInput(tiles), blocked: true };
  }

  const fixed: ReadonlyArray<Placement> = [pinnedPlacement, ...lockedPlacements];

  const movables = tiles
    .filter((t) => !t.locked && t.id !== pinned.id)
    .slice()
    .sort((a, b) => {
      const dRow = a.position.rowStart - b.position.rowStart;
      return dRow !== 0 ? dRow : a.position.colStart - b.position.colStart;
    });

  const placedMovables = movables.reduce<Placement[]>((acc, t) => {
    const all = [...fixed, ...acc];
    const placed = placeTile(t, all, columnCount);
    return placed ? [...acc, placed] : acc;
  }, []);

  if (placedMovables.length !== movables.length) {
    return { layout: snapshotFromInput(tiles), blocked: true };
  }

  const compacted = compactStable(placedMovables, fixed, columnCount);

  const placementById = new Map<string, TilePosition>(
    [pinnedPlacement, ...lockedPlacements, ...compacted].map((p) => [p.id, p.position]),
  );

  // Preserve the input tile order in the output snapshot — keeps layout
  // identity stable across pack() calls with the same input.
  const layout: TileLayoutSnapshot = tiles.map((t) => ({
    id: t.id,
    position: placementById.get(t.id) ?? { ...t.position },
  }));

  return { layout, blocked: false };
}

function snapshotFromInput(tiles: ReadonlyArray<PackInputTile>): TileLayoutSnapshot {
  return tiles.map((t) => ({ id: t.id, position: { ...t.position } }));
}

function placeTile(
  tile: PackInputTile,
  obstacles: ReadonlyArray<Placement>,
  columnCount: number,
): Placement | null {
  const { colSpan, rowSpan } = tile.position;
  if (colSpan > columnCount) return null;

  const inPlaceFits = !obstacles.some((o) => rectsOverlap(tile.position, o.position));
  if (inPlaceFits) {
    return { id: tile.id, position: { ...tile.position } };
  }

  const candidate = firstFit({ colSpan, rowSpan }, obstacles, columnCount);
  return candidate ? { id: tile.id, position: candidate } : null;
}

function firstFit(
  size: { colSpan: number; rowSpan: number },
  obstacles: ReadonlyArray<Placement>,
  columnCount: number,
): TilePosition | null {
  const lastRow = obstacles.reduce(
    (max, o) => Math.max(max, o.position.rowStart + o.position.rowSpan - 1),
    0,
  );
  // Worst case: stack right after the bottommost obstacle.
  const rowsToTry = lastRow + size.rowSpan;
  const cols = columnCount - size.colSpan + 1;
  if (cols < 1) return null;

  // Imperative loops here are deliberate — this runs on every pointermove
  // during a drag (live reflow) and the array-allocation patterns previously
  // used here generated GC pressure visible as drag jank.
  for (let rowStart = 1; rowStart <= rowsToTry; rowStart++) {
    for (let c = 0; c < cols; c++) {
      const colStart = c + 1;
      let collides = false;
      for (let i = 0; i < obstacles.length; i++) {
        if (
          rectsOverlap(
            { rowStart, colStart, colSpan: size.colSpan, rowSpan: size.rowSpan },
            obstacles[i].position,
          )
        ) {
          collides = true;
          break;
        }
      }
      if (!collides) {
        return { rowStart, colStart, colSpan: size.colSpan, rowSpan: size.rowSpan };
      }
    }
  }
  return null;
}

function compactStable(
  placements: ReadonlyArray<Placement>,
  fixed: ReadonlyArray<Placement>,
  columnCount: number,
): ReadonlyArray<Placement> {
  return iterate(placements, fixed, columnCount, 10);
}

function iterate(
  placements: ReadonlyArray<Placement>,
  fixed: ReadonlyArray<Placement>,
  columnCount: number,
  iterations: number,
): ReadonlyArray<Placement> {
  if (iterations <= 0) return placements;
  const { result, changed } = compactOnce(placements, fixed, columnCount);
  return changed ? iterate(result, fixed, columnCount, iterations - 1) : result;
}

function compactOnce(
  placements: ReadonlyArray<Placement>,
  fixed: ReadonlyArray<Placement>,
  columnCount: number,
): { result: ReadonlyArray<Placement>; changed: boolean } {
  // Process in current visual order: top-to-bottom, then left-to-right.
  const ordered = placements
    .slice()
    .sort((a, b) => {
      const dRow = a.position.rowStart - b.position.rowStart;
      return dRow !== 0 ? dRow : a.position.colStart - b.position.colStart;
    });

  return ordered.reduce<{ result: Placement[]; changed: boolean }>(
    (acc, p) => {
      const others = [...fixed, ...acc.result.filter((r) => r.id !== p.id)];
      const slid = slideUp(p.position, others);
      const changed = slid.rowStart !== p.position.rowStart;
      return {
        result: [...acc.result, { id: p.id, position: slid }],
        changed: acc.changed || changed,
      };
    },
    { result: [], changed: false },
  );
}

function slideUp(pos: TilePosition, others: ReadonlyArray<Placement>): TilePosition {
  if (pos.rowStart <= 1) return pos;
  // Same hot path as firstFit — keep imperative for GC-pressure reasons.
  for (let rowStart = 1; rowStart < pos.rowStart; rowStart++) {
    let collides = false;
    for (let i = 0; i < others.length; i++) {
      if (rectsOverlap({ ...pos, rowStart }, others[i].position)) {
        collides = true;
        break;
      }
    }
    if (!collides) return { ...pos, rowStart };
  }
  return pos;
}
