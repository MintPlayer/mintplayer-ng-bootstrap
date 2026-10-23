import { storedCounts } from './columns';
import { pack } from './pack';
import { scaleEdges } from './scale';
import type { MintTile, TileLayouts, TileLayoutSnapshot, TilePosition, TileSize } from './types';
import { rectsOverlap } from './types';

/** Where a rendered layout came from (D5). */
export type DerivedSource = 'stored' | 'projected' | 'scaled' | 'default';

export interface DerivedLayout {
  /** One entry per tile in `tiles`, in `tiles` order. */
  layout: TileLayoutSnapshot;
  source: DerivedSource;
  /** The stored count it was derived from, or null for `default`. */
  from: number | null;
}

/**
 * The layout rendered at `n` columns (D5–D9). Pure; the result is never stored or emitted.
 * 1. `layouts[n]`; 2. project down from the nearest larger stored count; 3. scale up from the
 * nearest smaller one; 4. nothing stored: every tile from `defaultSize`. Tiles the source does
 * not place are appended below the last occupied row (D8). Entries for ids not in `tiles` take
 * no space (D9). The nearest count is used, so the derivation cascades: with `layouts[3]`
 * stored, 2 and 1 derive from 3, not from 6.
 */
export function deriveLayout(layouts: TileLayouts | null | undefined, tiles: readonly MintTile[], n: number): DerivedLayout {
  const visible = new Set(tiles.map((t) => t.id));
  const counts = storedCounts(layouts);
  const pick = (count: number) => uniqueById((layouts?.[count] ?? []).filter((e) => visible.has(e.id)));
  const larger = counts.find((c) => c > n);
  const smaller = counts.filter((c) => c < n).pop();

  const base: DerivedLayout = counts.includes(n)
    ? { layout: isValid(pick(n), n) ? pick(n) : projectDown(pick(n), n), source: 'stored', from: n }
    : larger !== undefined
      ? { layout: projectDown(pick(larger), n), source: 'projected', from: larger }
      : smaller !== undefined
        ? { layout: scaleEdges(pick(smaller), smaller, n), source: 'scaled', from: smaller }
        : { layout: [], source: 'default', from: null };

  const placed = appendMissing(base.layout, tiles, n);
  const byId = new Map(placed.map((e) => [e.id, e.position]));
  return { ...base, layout: tiles.map((t) => ({ id: t.id, position: byId.get(t.id) as TilePosition })) };
}

/**
 * Project down (D6): reading order, the plain cap `colSpan' = min(colSpan, n)`,
 * `colStart' = min(colStart, n − colSpan' + 1)`, `rowSpan` unchanged, then `pack()`.
 * Tiles keep their width and wrap.
 */
export function projectDown(layout: TileLayoutSnapshot, n: number): TileLayoutSnapshot {
  const capped = layout
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.position.rowStart - b.entry.position.rowStart || a.entry.position.colStart - b.entry.position.colStart || a.index - b.index)
    .map(({ entry: { id, position } }) => {
      const colSpan = Math.min(position.colSpan, n);
      const colStart = Math.max(1, Math.min(position.colStart, n - colSpan + 1));
      return { id, position: { ...position, colStart, colSpan }, locked: false };
    });
  return pack(capped, null, n).layout;
}

/** Stored counts narrower than `count`: an edit at `count` does not reach them (D15). */
export function staleCounts(layouts: TileLayouts | null | undefined, count: number): number[] {
  return storedCounts(layouts).filter((c) => c < count);
}

/** Drops every stored layout narrower than `count`, so those counts derive from it again (D15). */
export function withoutNarrowerLayouts(layouts: TileLayouts | null | undefined, count: number): TileLayouts {
  return Object.fromEntries(Object.entries(layouts ?? {}).filter(([key]) => !(Number(key) < count)));
}

/** Drops `layouts[count]`; the backing of `resetLayout(count)` (D15). */
export function withoutLayout(layouts: TileLayouts | null | undefined, count: number): TileLayouts {
  return Object.fromEntries(Object.entries(layouts ?? {}).filter(([key]) => Number(key) !== count));
}

/**
 * The next `layouts` record after a commit at `n` (D11, D12). Entries already stored at `n`
 * for ids not in `tiles` are passed through unchanged, so a re-shown tile returns to its spot (D9).
 */
export function withLayout(layouts: TileLayouts | null | undefined, n: number, layout: TileLayoutSnapshot, tiles: readonly MintTile[]): TileLayouts {
  const visible = new Set(tiles.map((t) => t.id));
  const hidden = (layouts?.[n] ?? []).filter((e) => !visible.has(e.id));
  return { ...(layouts ?? {}), [n]: [...layout, ...hidden] };
}

function uniqueById(layout: TileLayoutSnapshot): TileLayoutSnapshot {
  const seen = new Set<string>();
  return layout.filter((e) => !seen.has(e.id) && !!seen.add(e.id));
}

/** In range and overlap-free. A hand-edited or stale stored layout that is not gets projected instead. */
function isValid(layout: TileLayoutSnapshot, n: number): boolean {
  const inRange = layout.every(({ position: p }) => p.colStart >= 1 && p.rowStart >= 1 && p.colSpan >= 1 && p.rowSpan >= 1 && p.colStart + p.colSpan - 1 <= n);
  return inRange && layout.every((a, i) => layout.slice(i + 1).every((b) => !rectsOverlap(a.position, b.position)));
}

/** D8: tiles the layout does not place go below its last occupied row, in `tiles` order. */
function appendMissing(layout: TileLayoutSnapshot, tiles: readonly MintTile[], n: number): TileLayoutSnapshot {
  const present = new Set(layout.map((e) => e.id));
  const startRow = layout.reduce((max, e) => Math.max(max, e.position.rowStart + e.position.rowSpan), 1);
  return tiles
    .filter((t) => !present.has(t.id))
    .reduce(
      (acc, tile) => {
        const size = sizeOf(tile.defaultSize, n);
        const position = nextFreeSlot(size, acc.placed, n, acc.cursor);
        return { placed: [...acc.placed, { id: tile.id, position }], cursor: { row: position.rowStart, col: position.colStart + size.colSpan } };
      },
      { placed: [...layout], cursor: { row: startRow, col: 1 } },
    ).placed;
}

function sizeOf(size: TileSize | undefined, n: number): TileSize {
  return { colSpan: Math.max(1, Math.min(size?.colSpan ?? 1, n)), rowSpan: Math.max(1, size?.rowSpan ?? 1) };
}

/** The first free slot at or after `cursor` in reading order, so appended tiles keep `tiles` order. */
function nextFreeSlot(size: TileSize, placed: TileLayoutSnapshot, n: number, cursor: { row: number; col: number }): TilePosition {
  // Imperative scan, like pack's firstFit; it always terminates because rows below every obstacle are free.
  for (let rowStart = cursor.row; ; rowStart++) {
    for (let colStart = rowStart === cursor.row ? cursor.col : 1; colStart + size.colSpan - 1 <= n; colStart++) {
      const rect = { colStart, rowStart, ...size };
      if (!placed.some((e) => rectsOverlap(rect, e.position))) return rect;
    }
  }
}
