import type { TileLayoutSnapshot } from './types';

/**
 * Maps every column edge `e → round(e × to / from)` (D7). Edges keep their order, so
 * touching tiles stay touching and nothing overlaps; the board fills the new width.
 * Rows are unchanged. Used only upward (`to > from`), where every span stays ≥ 1;
 * the clamp only guards a misuse downward. Never stored, so it is lossless.
 */
export function scaleEdges(layout: TileLayoutSnapshot, from: number, to: number): TileLayoutSnapshot {
  const edge = (e: number) => Math.round((e * to) / from);
  return layout.map(({ id, position }) => {
    const start = edge(position.colStart - 1);
    const end = edge(position.colStart - 1 + position.colSpan);
    const colStart = Math.min(start + 1, to);
    return { id, position: { ...position, colStart, colSpan: Math.max(1, Math.min(end - start, to - colStart + 1)) } };
  });
}
