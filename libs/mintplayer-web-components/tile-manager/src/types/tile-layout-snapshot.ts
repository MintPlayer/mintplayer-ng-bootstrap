import { TilePosition } from './tile-position';

/**
 * Stable, JSON-serializable snapshot of the manager's layout.
 * One entry per tile, keyed by stable id. Host apps `JSON.stringify`
 * this for persistence and project it back into per-tile `position`
 * inputs to restore.
 */
export type TileLayoutSnapshot = Array<{
  id: string;
  position: TilePosition;
}>;

export interface TileGestureBlocked {
  id: string;
  reason: 'locked-overlap' | 'no-valid-layout';
}
