import { Machine } from '@mintplayer/ui-core/store';
import { cellOrigin, dragTranslate, pointerToGridRect, resizeSpans, type CellMetrics, type GridPoint, type ResizeHandle } from './grid-geometry';
import { pack } from './pack';
import type { GridRect, MintTile, TileLayoutSnapshot, TilePosition } from './types';

/**
 * S3 PROTOTYPE (docs/prd/spikes/issue-440/S3-gesture-split.md): the gesture and
 * keyboard slice of the future TileManagerMachine. DOM-free: fronts forward
 * grid-local pointer coordinates and key names, read the cell metrics once at
 * pointerdown, and act on the returned verdict (capture or not). Layouts keyed by
 * column count, measuring and derivation arrive in M2.
 */

export type TileDragMode = 'tile' | 'header' | 'off';
export type TileResizeMode = 'hover' | 'always' | 'off';
/** Which node received the pointerdown. Each front binds the handler per node, so no DOM walk is needed. */
export type TilePart = 'header' | 'body' | ResizeHandle;

/** A pointer event reduced to numbers. `x`/`y` are relative to the grid's top-left corner. */
export interface TilePointer {
  x: number;
  y: number;
  pointerId: number;
  pointerType: string;
  button: number;
  buttons: number;
}

/**
 * What the front does with the event: nothing, keep forwarding moves, or call
 * `setPointerCapture` on the tile (and `preventDefault`) because a gesture began.
 */
export type PointerVerdict = 'ignore' | 'track' | 'capture';

export type TileGesture =
  | { kind: 'idle' }
  | { kind: 'pending'; tileId: string; pointerId: number; start: GridPoint; touch: boolean; pressing: boolean }
  | { kind: 'drag'; tileId: string; pointerId: number; grab: GridPoint; pointer: GridPoint; rect: GridRect; blocked: boolean }
  | {
      kind: 'resize';
      tileId: string;
      pointerId: number;
      handle: ResizeHandle;
      start: GridPoint;
      startSpans: { colSpan: number; rowSpan: number };
      rect: GridRect;
      blocked: boolean;
    };

export type TileKeyboard = { kind: 'idle' } | { kind: 'move'; tileId: string; entry: TileLayoutSnapshot };

export interface TileManagerState {
  tiles: readonly MintTile[];
  /** The committed layout. */
  layout: TileLayoutSnapshot;
  /** The layout while a gesture or keyboard move is in flight; rendered instead of `layout`. */
  preview: TileLayoutSnapshot | null;
  columnCount: number;
  cell: CellMetrics | null;
  dragMode: TileDragMode;
  resizeMode: TileResizeMode;
  gesture: TileGesture;
  keyboard: TileKeyboard;
  focusedTileId: string | null;
  /** Bumped when a keyboard command moves focus; the front focuses the tile with that id. */
  focusRequest: { tileId: string; seq: number } | null;
  announcement: { text: string; seq: number };
}

export type TileManagerEvent =
  | { type: 'layoutchange'; layout: TileLayoutSnapshot }
  | { type: 'layoutpreview'; layout: TileLayoutSnapshot }
  | { type: 'gestureblocked'; id: string; reason: 'locked-overlap' };

export interface TimerHost {
  setTimeout(handler: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface TileManagerOptions {
  timers?: TimerHost;
  /** Haptic tick when a touch long-press arms a drag. */
  vibrate?: (ms: number) => void;
}

export const TOUCH_LONG_PRESS_MS = 600;
export const TOUCH_LONG_PRESS_SLOP_PX = 10;
export const TOUCH_PRESS_FEEDBACK_DELAY_MS = 150;
export const POINTER_DRAG_THRESHOLD_PX = 5;

type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class TileManagerMachine extends Machine<TileManagerState> {
  readonly #timers: TimerHost;
  readonly #vibrate: ((ms: number) => void) | undefined;
  readonly #listeners = new Set<(event: TileManagerEvent) => void>();
  #touchTimers: unknown[] = [];
  #seq = 0;

  constructor(options: TileManagerOptions = {}) {
    super({
      tiles: [],
      layout: [],
      preview: null,
      columnCount: 1,
      cell: null,
      dragMode: 'header',
      resizeMode: 'hover',
      gesture: { kind: 'idle' },
      keyboard: { kind: 'idle' },
      focusedTileId: null,
      focusRequest: null,
      announcement: { text: '', seq: 0 },
    });
    this.#timers = options.timers ?? {
      // Wrapped: a browser's setTimeout throws "Illegal invocation" on the wrong receiver.
      setTimeout: (handler, ms) => setTimeout(handler, ms),
      clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    };
    this.#vibrate = options.vibrate;
  }

  onEvent(listener: (event: TileManagerEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  setInputs(inputs: Partial<Pick<TileManagerState, 'tiles' | 'layout' | 'columnCount' | 'dragMode' | 'resizeMode'>>): void {
    this.update(inputs);
  }

  /** The layout on screen: the preview while one exists, else the committed layout. */
  get rendered(): TileLayoutSnapshot {
    return this.snapshot.preview ?? this.snapshot.layout;
  }

  // ---------------- Pointer ----------------

  pointerDown(tileId: string, part: TilePart, p: TilePointer, cell: CellMetrics): PointerVerdict {
    const s = this.snapshot;
    if (p.pointerType === 'mouse' && p.button !== 0) return 'ignore';
    // The same pointerdown bubbling from a grip or the header to the tile: the innermost part already decided.
    if (s.gesture.kind !== 'idle' && s.gesture.pointerId === p.pointerId) return 'ignore';
    // A pending mouse press whose pointerup landed outside the tile is stale, not a reason to refuse.
    if (s.gesture.kind === 'pending') this.#clearPending();
    else if (s.gesture.kind !== 'idle') return 'ignore';
    const tile = s.tiles.find((t) => t.id === tileId);
    const position = this.#position(tileId);
    if (!tile || !position) return 'ignore';
    const touch = p.pointerType === 'touch';

    if (part !== 'header' && part !== 'body') {
      if (s.resizeMode === 'off' || tile.disableResize) return 'ignore';
      this.batch(() => {
        this.update({
          cell,
          gesture: {
            kind: 'resize',
            tileId,
            pointerId: p.pointerId,
            handle: part,
            start: { x: p.x, y: p.y },
            startSpans: { colSpan: position.colSpan, rowSpan: position.rowSpan },
            rect: { ...position },
            blocked: false,
          },
        });
        this.#announce(`Resizing ${this.#label(tile, position)}.`);
        this.#pack();
      });
      return 'capture';
    }

    if (s.dragMode === 'off' || tile.disableMove) return 'ignore';
    // Touch drags start from the header even in 'tile' mode, so a finger on the content still scrolls.
    if ((s.dragMode === 'header' || touch) && part !== 'header') return 'ignore';

    this.update({ cell, gesture: { kind: 'pending', tileId, pointerId: p.pointerId, start: { x: p.x, y: p.y }, touch, pressing: false } });
    if (touch) {
      this.#touchTimers = [
        this.#timers.setTimeout(() => this.#pressFeedback(p.pointerId), TOUCH_PRESS_FEEDBACK_DELAY_MS),
        this.#timers.setTimeout(() => this.#armTouch(p.pointerId), TOUCH_LONG_PRESS_MS),
      ];
    }
    return 'track';
  }

  pointerMove(p: TilePointer): PointerVerdict {
    const g = this.snapshot.gesture;
    if (g.kind === 'idle' || g.pointerId !== p.pointerId) return 'ignore';
    if (g.kind === 'pending') {
      const distance = Math.hypot(p.x - g.start.x, p.y - g.start.y);
      if (g.touch) {
        if (distance > TOUCH_LONG_PRESS_SLOP_PX) this.#clearPending();
        return 'ignore';
      }
      if (p.buttons === 0) {
        this.#clearPending();
        return 'ignore';
      }
      if (distance < POINTER_DRAG_THRESHOLD_PX) return 'track';
      this.batch(() => {
        this.#startDrag(g.tileId, g.pointerId, g.start);
        this.#movePointer({ x: p.x, y: p.y });
      });
      return 'capture';
    }
    this.#movePointer({ x: p.x, y: p.y });
    return 'track';
  }

  pointerUp(p: Pick<TilePointer, 'pointerId'>): void {
    const g = this.snapshot.gesture;
    if (g.kind === 'idle' || g.pointerId !== p.pointerId) return;
    if (g.kind === 'pending') return this.#clearPending();
    if (g.blocked) return this.cancelGesture('blocked');
    this.#commitGesture();
  }

  pointerCancel(p: Pick<TilePointer, 'pointerId'>): void {
    const g = this.snapshot.gesture;
    if (g.kind === 'idle' || g.pointerId !== p.pointerId) return;
    this.cancelGesture();
  }

  cancelGesture(reason: 'cancel' | 'blocked' = 'cancel'): void {
    const g = this.snapshot.gesture;
    if (g.kind === 'pending') return this.#clearPending();
    if (g.kind === 'idle') return;
    if (reason === 'blocked') this.#emit({ type: 'gestureblocked', id: g.tileId, reason: 'locked-overlap' });
    this.update({ gesture: { kind: 'idle' }, preview: null });
  }

  /** The translate that keeps a dragged tile under the pointer between snaps; null for every other tile. */
  dragOffset(tileId: string): GridPoint | null {
    const { gesture: g, cell } = this.snapshot;
    if (g.kind !== 'drag' || g.tileId !== tileId || !cell) return null;
    return dragTranslate({ pointer: g.pointer, gridOrigin: { x: 0, y: 0 }, pointerOffset: g.grab }, g.rect, cell);
  }

  #pressFeedback(pointerId: number): void {
    const g = this.snapshot.gesture;
    if (g.kind === 'pending' && g.pointerId === pointerId) this.update({ gesture: { ...g, pressing: true } });
  }

  #armTouch(pointerId: number): void {
    const g = this.snapshot.gesture;
    if (g.kind !== 'pending' || g.pointerId !== pointerId) return;
    this.#clearTouchTimers();
    try {
      this.#vibrate?.(10);
    } catch {
      // vibrate is not available everywhere
    }
    this.batch(() => {
      this.#startDrag(g.tileId, g.pointerId, g.start);
      this.#movePointer(g.start);
    });
  }

  #startDrag(tileId: string, pointerId: number, start: GridPoint): void {
    const { cell, tiles } = this.snapshot;
    const position = this.#position(tileId);
    const tile = tiles.find((t) => t.id === tileId);
    if (!cell || !position || !tile) return;
    const origin = cellOrigin(position, cell);
    this.update({
      gesture: { kind: 'drag', tileId, pointerId, grab: { x: start.x - origin.x, y: start.y - origin.y }, pointer: start, rect: { ...position }, blocked: false },
    });
    this.#announce(`Dragging ${this.#label(tile, position)}.`);
  }

  #movePointer(pointer: GridPoint): void {
    const { gesture: g, cell, columnCount } = this.snapshot;
    if (!cell) return;
    const position = g.kind === 'drag' || g.kind === 'resize' ? this.#position(g.tileId) : null;
    if (!position) return;
    if (g.kind === 'drag') {
      const rect = pointerToGridRect({ pointer, gridOrigin: { x: 0, y: 0 }, pointerOffset: g.grab }, position, cell, columnCount) ?? g.rect;
      this.update({ gesture: { ...g, pointer, rect } });
    } else if (g.kind === 'resize') {
      const spans = resizeSpans({ x: pointer.x - g.start.x, y: pointer.y - g.start.y }, g.handle, g.startSpans, position.colStart, cell, columnCount);
      if (spans) this.update({ gesture: { ...g, rect: { colStart: position.colStart, rowStart: position.rowStart, ...spans } } });
    }
    this.#pack();
  }

  /** Re-pack around the gesture's target rect. Only announces and emits when the snapped rect changes. */
  #pack(): void {
    const g = this.snapshot.gesture;
    if (g.kind !== 'drag' && g.kind !== 'resize') return;
    const previous = this.snapshot.preview;
    const result = this.#packAround(g.tileId, g.rect);
    const changed = !previous || !sameLayout(previous, result.layout);
    this.batch(() => {
      if (result.blocked && !g.blocked) this.#announce('Move blocked by a locked tile.');
      this.update({ gesture: { ...g, blocked: result.blocked }, preview: changed ? result.layout : previous });
    });
    if (changed && !result.blocked) this.#emit({ type: 'layoutpreview', layout: result.layout });
  }

  #packAround(tileId: string, rect: GridRect) {
    const { tiles, layout, columnCount } = this.snapshot;
    const locked = new Set(tiles.filter((t) => t.disableMove).map((t) => t.id));
    return pack(
      layout.map((entry) => ({ id: entry.id, position: entry.position, locked: locked.has(entry.id) })),
      { id: tileId, rect },
      columnCount,
    );
  }

  #commitGesture(): void {
    const { gesture: g, preview, layout } = this.snapshot;
    if (g.kind !== 'drag' && g.kind !== 'resize') return;
    const next = preview ?? layout;
    const moved = next.find((entry) => entry.id === g.tileId)?.position;
    this.batch(() => {
      this.update({ gesture: { kind: 'idle' }, preview: null, layout: next });
      if (moved) {
        this.#announce(
          g.kind === 'drag'
            ? `Tile moved to row ${moved.rowStart}, column ${moved.colStart}.`
            : `Tile resized to ${moved.colSpan} columns by ${moved.rowSpan} rows.`,
        );
      }
    });
    if (!sameLayout(layout, next)) this.#emit({ type: 'layoutchange', layout: next });
  }

  #clearPending(): void {
    this.#clearTouchTimers();
    if (this.snapshot.gesture.kind === 'pending') this.update({ gesture: { kind: 'idle' } });
  }

  #clearTouchTimers(): void {
    this.#touchTimers.forEach((handle) => this.#timers.clearTimeout(handle));
    this.#touchTimers = [];
  }

  // ---------------- Keyboard ----------------

  /** Returns true when the key was consumed; the front then calls preventDefault. */
  keydown(tileId: string, key: string, mods: { shift?: boolean } = {}): boolean {
    const s = this.snapshot;
    if (key === 'Escape' && (s.gesture.kind === 'drag' || s.gesture.kind === 'resize')) {
      this.cancelGesture();
      return true;
    }
    const tile = s.tiles.find((t) => t.id === tileId);
    if (!tile) return false;
    const km = s.keyboard;

    if (km.kind === 'idle') {
      if (key === 'm' || key === 'M') {
        const canMove = s.dragMode !== 'off' && !tile.disableMove;
        const canResize = s.resizeMode !== 'off' && !tile.disableResize;
        if (!canMove && !canResize) return false;
        this.batch(() => {
          this.update({ keyboard: { kind: 'move', tileId, entry: s.layout }, preview: s.layout });
          this.#announce('Move mode enabled. Use arrow keys to move, Shift with arrow keys to resize, Enter to commit, Escape to cancel.');
        });
        return true;
      }
      return this.#navigate(tileId, key);
    }

    if (km.tileId !== tileId) return false;
    if (key === 'Enter') {
      this.#endKeyboardMove(true);
      return true;
    }
    if (key === 'Escape') {
      this.#endKeyboardMove(false);
      return true;
    }
    if (ARROWS.has(key)) {
      this.#keyboardStep(tile, key as ArrowKey, !!mods.shift);
      return true;
    }
    return false;
  }

  focus(tileId: string): void {
    this.update({ focusedTileId: tileId });
  }

  /** Focus left the tile: a keyboard move in progress commits (PRD M2). */
  blur(tileId: string): void {
    const km = this.snapshot.keyboard;
    if (km.kind === 'move' && km.tileId === tileId) this.#endKeyboardMove(true);
  }

  /** The single tile carrying tabindex=0. */
  get tabStop(): string | null {
    const { focusedTileId, tiles } = this.snapshot;
    if (focusedTileId && tiles.some((t) => t.id === focusedTileId)) return focusedTileId;
    return readingOrder(this.rendered)[0]?.id ?? null;
  }

  #keyboardStep(tile: MintTile, key: ArrowKey, resize: boolean): void {
    const s = this.snapshot;
    const position = this.#position(tile.id);
    if (!position) return;
    if (resize ? s.resizeMode === 'off' || tile.disableResize : s.dragMode === 'off' || tile.disableMove) {
      this.#announce(resize ? 'This tile cannot be resized.' : 'This tile cannot be moved.');
      return;
    }
    const cols = s.columnCount;
    const dx = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0;
    const dy = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;
    const rect: GridRect = resize
      ? {
          colStart: position.colStart,
          rowStart: position.rowStart,
          colSpan: Math.max(1, Math.min(position.colSpan + dx, cols - position.colStart + 1)),
          rowSpan: Math.max(1, position.rowSpan + dy),
        }
      : {
          colStart: Math.max(1, Math.min(position.colStart + dx, cols - position.colSpan + 1)),
          rowStart: Math.max(1, position.rowStart + dy),
          colSpan: position.colSpan,
          rowSpan: position.rowSpan,
        };
    // Keyboard steps pack against the preview, so successive steps accumulate.
    const { tiles, preview, layout } = s;
    const base = preview ?? layout;
    const locked = new Set(tiles.filter((t) => t.disableMove).map((t) => t.id));
    const result = pack(base.map((e) => ({ id: e.id, position: e.position, locked: locked.has(e.id) })), { id: tile.id, rect }, cols);
    if (result.blocked) {
      this.#announce('Move blocked.');
      return;
    }
    this.batch(() => {
      this.update({ preview: result.layout });
      this.#announce(
        resize
          ? `${rect.colSpan} columns by ${rect.rowSpan} rows.`
          : `Column ${rect.colStart} of ${cols}, row ${rect.rowStart}.`,
      );
    });
    this.#emit({ type: 'layoutpreview', layout: result.layout });
  }

  #endKeyboardMove(commit: boolean): void {
    const { keyboard: km, preview, layout } = this.snapshot;
    if (km.kind !== 'move') return;
    const next = commit && preview ? preview : km.entry;
    this.batch(() => {
      this.update({ keyboard: { kind: 'idle' }, preview: null, layout: next });
      this.#announce(commit ? 'Move committed.' : 'Move cancelled and reverted.');
    });
    if (!sameLayout(layout, next)) this.#emit({ type: 'layoutchange', layout: next });
  }

  #navigate(tileId: string, key: string): boolean {
    if (!ARROWS.has(key) && key !== 'Home' && key !== 'End') return false;
    const ordered = readingOrder(this.rendered);
    const idx = ordered.findIndex((e) => e.id === tileId);
    if (idx < 0 || ordered.length <= 1) return false;
    const next =
      key === 'Home' ? 0 : key === 'End' ? ordered.length - 1 : key === 'ArrowRight' || key === 'ArrowDown' ? (idx + 1) % ordered.length : (idx - 1 + ordered.length) % ordered.length;
    const target = ordered[next].id;
    this.update({ focusedTileId: target, focusRequest: { tileId: target, seq: ++this.#seq } });
    return true;
  }

  // ---------------- Helpers ----------------

  #position(tileId: string): TilePosition | null {
    return this.rendered.find((e) => e.id === tileId)?.position ?? null;
  }

  #label(tile: MintTile, position: TilePosition): string {
    return tile.label ?? `tile at row ${position.rowStart}, column ${position.colStart}`;
  }

  #announce(text: string): void {
    this.update({ announcement: { text, seq: ++this.#seq } });
  }

  #emit(event: TileManagerEvent): void {
    this.#listeners.forEach((listener) => listener(event));
  }

  override destroy(): void {
    this.#clearTouchTimers();
    this.#listeners.clear();
    super.destroy();
  }
}

function sameLayout(a: TileLayoutSnapshot, b: TileLayoutSnapshot): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((e) => [e.id, e.position]));
  return a.every((e) => {
    const o = byId.get(e.id);
    return !!o && o.colStart === e.position.colStart && o.rowStart === e.position.rowStart && o.colSpan === e.position.colSpan && o.rowSpan === e.position.rowSpan;
  });
}

function readingOrder(layout: TileLayoutSnapshot): TileLayoutSnapshot {
  return [...layout].sort((a, b) => a.position.rowStart - b.position.rowStart || a.position.colStart - b.position.colStart);
}
