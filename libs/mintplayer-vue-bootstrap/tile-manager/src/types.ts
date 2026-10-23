import type { TileLayoutSnapshot } from '@mintplayer/ui-core/tile-manager';

/** Payload of `columnCountChange`. */
export interface BsTileColumnCountChange {
  columnCount: number;
  previous: number | null;
}

/** What a template ref on `<BsTileManager>` exposes. */
export interface BsTileManagerExposed {
  /** What is rendered: the resolved column count and its layout (the preview while editing). */
  captureLayout(): { columnCount: number; layout: TileLayoutSnapshot };
  /** Drops `layouts[count]` and commits, so that count derives again (D15). */
  resetLayout(count: number): void;
  /** True while a pointer drag or resize is in flight. */
  isGestureActive(): boolean;
}
