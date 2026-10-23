import { Machine } from '@mintplayer/ui-core/store';
import { maxColumnCount, resolveColumnCount, type ColumnOptions } from './columns';
import { deriveLayout, staleCounts, withLayout, withoutLayout } from './derive';
import { cellOrigin, dragTranslate, pointerToGridRect, resizeSpans, type CellMetrics, type GridPoint, type ResizeHandle } from './grid-geometry';
import { DEFAULT_TILE_MANAGER_MESSAGES, type TileManagerMessages } from './messages';
import { pack } from './pack';
import type { GridRect, MintTile, TileBreakpoint, TileGestureBlocked, TileLayouts, TileLayoutSnapshot, TilePosition } from './types';

/**
 * The tile manager's state machine (PRD §5.1). DOM-free: fronts forward the
 * measured grid width, grid-local pointer coordinates and key names, read the
 * cell metrics once at pointerdown, and act on the returned verdict. Positions
 * live in `layouts`, keyed by column count; the layout on screen is derived for
 * the resolved count (D5), and every gesture computes from that rendered layout.
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

/** M (move) or R (resize) mode. `entry` is the layout Escape reverts to, kept across an M/R switch. */
export type TileKeyboard = { kind: 'idle' } | { kind: 'move' | 'resize'; tileId: string; entry: TileLayoutSnapshot };

export interface TileManagerInputs {
  /** The visible tiles, in DOM order (D9). */
  tiles: readonly MintTile[];
  layouts: TileLayouts;
  breakpoints: readonly TileBreakpoint[] | null;
  stackBelow: number | null;
  /** px */
  minColumnWidth: number;
  /** px between columns. */
  gap: number;
  maxColumns: number;
  dragMode: TileDragMode;
  resizeMode: TileResizeMode;
  messages: TileManagerMessages;
}

export type TileManagerInputPatch = Partial<Omit<TileManagerInputs, 'messages'>> & { messages?: Partial<TileManagerMessages> };

export interface TileManagerState extends TileManagerInputs {
  /** False until the first `measure()`. Before it, fronts write no inline position (D14). */
  measured: boolean;
  columnCount: number;
  /** The committed layout derived for `columnCount`: visible tiles only, in `tiles` order. */
  layout: TileLayoutSnapshot;
  /** The layout while a gesture or keyboard mode is in flight; rendered instead of `layout`. */
  preview: TileLayoutSnapshot | null;
  cell: CellMetrics | null;
  gesture: TileGesture;
  keyboard: TileKeyboard;
  focusedTileId: string | null;
  /** Bumped when a keyboard command moves focus; the front focuses the tile with that id. */
  focusRequest: { tileId: string; seq: number } | null;
  announcement: { text: string; seq: number };
}

/** Payload of `layoutchange` and `layoutpreview` (D11, D15). */
export interface TileLayoutChange {
  columnCount: number;
  /** The full layout for `columnCount`, hidden tiles passed through. */
  layout: TileLayoutSnapshot;
  /** The full next record. */
  layouts: TileLayouts;
  /** Stored counts below `columnCount` this edit does not reach. */
  staleCounts: number[];
}

export type TileManagerEvent =
  | ({ type: 'layoutchange' } & TileLayoutChange)
  | ({ type: 'layoutpreview' } & TileLayoutChange)
  | { type: 'columncountchange'; columnCount: number; previous: number | null }
  | ({ type: 'gestureblocked' } & TileGestureBlocked);

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
export const DEFAULT_MIN_COLUMN_WIDTH = 200;
export const DEFAULT_GAP = 8;

type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
type Capability = 'move' | 'resize';
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class TileManagerMachine extends Machine<TileManagerState> {
  readonly #timers: TimerHost;
  readonly #vibrate: ((ms: number) => void) | undefined;
  readonly #listeners = new Set<(event: TileManagerEvent) => void>();
  #touchTimers: unknown[] = [];
  #width: number | null = null;
  #seq = 0;

  constructor(options: TileManagerOptions = {}) {
    super({
      tiles: [],
      layouts: {},
      breakpoints: null,
      stackBelow: null,
      minColumnWidth: DEFAULT_MIN_COLUMN_WIDTH,
      gap: DEFAULT_GAP,
      maxColumns: 6,
      dragMode: 'header',
      resizeMode: 'hover',
      messages: DEFAULT_TILE_MANAGER_MESSAGES,
      measured: false,
      columnCount: 6,
      layout: [],
      preview: null,
      cell: null,
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

  /**
   * Apply changed inputs. A new `layouts` object replaces the internal copy (D12);
   * fronts forward only the inputs that changed, so a stale controlled value is
   * never re-pushed over a commit.
   */
  setInputs(inputs: TileManagerInputPatch): void {
    const { messages, ...rest } = inputs;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined)) as Partial<TileManagerState>;
    if (messages) patch.messages = { ...DEFAULT_TILE_MANAGER_MESSAGES, ...messages };
    this.batch(() => {
      this.update(patch);
      if (!this.snapshot.measured) this.update({ columnCount: maxColumnCount(this.snapshot) });
      this.#guardInteraction();
      this.#derive();
      this.#resolve(false);
    });
  }

  /** The grid's content-box inline size in px. State changes only when the resolved count does. */
  measure(width: number): void {
    this.#width = width;
    this.#resolve(false);
  }

  /** The layout on screen: the preview while one exists, else the committed layout. */
  get rendered(): TileLayoutSnapshot {
    return this.snapshot.preview ?? this.snapshot.layout;
  }

  /** Whether `tileId` may be moved or resized: the board mode and the tile flag, most restrictive wins (D10). */
  can(tileId: string, capability: Capability): boolean {
    const s = this.snapshot;
    const tile = s.tiles.find((t) => t.id === tileId);
    if (!tile) return false;
    return capability === 'move' ? s.dragMode !== 'off' && !tile.disableMove : s.resizeMode !== 'off' && !tile.disableResize;
  }

  /** Drop the stored layout for `count` and commit, so that count derives again (D15). */
  resetLayout(count: number): void {
    const s = this.snapshot;
    if (!Object.prototype.hasOwnProperty.call(s.layouts, count)) return;
    const layouts = withoutLayout(s.layouts, count);
    this.batch(() => {
      if (count === s.columnCount) {
        this.cancelGesture();
        this.#endKeyboard(false);
      }
      this.update({ layouts });
      this.#derive();
    });
    this.#emit({ type: 'layoutchange', ...this.#payload(layouts, count) });
  }

  // ---------------- Pointer ----------------

  pointerDown(tileId: string, part: TilePart, p: TilePointer, cell: CellMetrics): PointerVerdict {
    const s = this.snapshot;
    if (p.pointerType === 'mouse' && p.button !== 0) return 'ignore';
    if (s.keyboard.kind !== 'idle') return 'ignore';
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
      if (!this.can(tileId, 'resize')) return 'ignore';
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
        this.#announce(s.messages.resizing(this.#label(tile, position)));
        this.#pack();
      });
      return 'capture';
    }

    if (!this.can(tileId, 'move')) return 'ignore';
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
    const { gesture: g, preview, layout } = this.snapshot;
    if (g.kind === 'pending') return this.#clearPending();
    if (g.kind === 'idle') return;
    if (reason === 'blocked') this.#emit({ type: 'gestureblocked', id: g.tileId, reason: 'locked-overlap' });
    this.batch(() => {
      this.update({ gesture: { kind: 'idle' }, preview: null });
      this.#resolve(false);
    });
    if (preview && !sameLayout(preview, layout)) this.#emitPreview(layout);
  }

  /**
   * The translate that keeps a dragged tile under the pointer between snaps; null for every other tile.
   * Relative to the cell the tile is RENDERED in: over a blocked cell the preview keeps the last valid
   * place, so measuring from the blocked target would throw the tile that whole distance away.
   */
  dragOffset(tileId: string): GridPoint | null {
    const { gesture: g, cell } = this.snapshot;
    const rendered = this.#position(tileId);
    if (g.kind !== 'drag' || g.tileId !== tileId || !cell || !rendered) return null;
    return dragTranslate({ pointer: g.pointer, gridOrigin: { x: 0, y: 0 }, pointerOffset: g.grab }, rendered, cell);
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
    const { cell, tiles, messages } = this.snapshot;
    const position = this.#position(tileId);
    const tile = tiles.find((t) => t.id === tileId);
    if (!cell || !position || !tile) return;
    // The rendered position, never a stored one: a stored column past the last track is not where the tile is.
    const origin = cellOrigin(position, cell);
    this.update({
      gesture: { kind: 'drag', tileId, pointerId, grab: { x: start.x - origin.x, y: start.y - origin.y }, pointer: start, rect: { ...position }, blocked: false },
    });
    this.#announce(messages.dragging(this.#label(tile, position)));
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
    const result = this.#packAround(this.snapshot.layout, g.tileId, g.rect);
    const changed = !previous || !sameLayout(previous, result.layout);
    this.batch(() => {
      if (result.blocked && !g.blocked) this.#announce(this.snapshot.messages.gestureBlocked);
      this.update({ gesture: { ...g, blocked: result.blocked }, preview: changed && !result.blocked ? result.layout : previous ?? this.snapshot.layout });
    });
    if (changed && !result.blocked) this.#emitPreview(result.layout);
  }

  #commitGesture(): void {
    const { gesture: g, preview, layout, messages } = this.snapshot;
    if (g.kind !== 'drag' && g.kind !== 'resize') return;
    const next = preview ?? layout;
    const moved = next.find((entry) => entry.id === g.tileId)?.position;
    this.batch(() => {
      this.update({ gesture: { kind: 'idle' }, preview: null });
      this.#commit(next, layout);
      if (moved) {
        this.#announce(g.kind === 'drag' ? messages.movedTo(moved.rowStart, moved.colStart) : messages.resizedTo(moved.colSpan, moved.rowSpan));
      }
      this.#resolve(false);
    });
  }

  #clearPending(): void {
    this.#clearTouchTimers();
    if (this.snapshot.gesture.kind === 'pending') {
      this.batch(() => {
        this.update({ gesture: { kind: 'idle' } });
        this.#resolve(false);
      });
    }
  }

  #clearTouchTimers(): void {
    this.#touchTimers.forEach((handle) => this.#timers.clearTimeout(handle));
    this.#touchTimers = [];
  }

  // ---------------- Keyboard ----------------

  /** Returns true when the key was consumed; the front then calls preventDefault. */
  keydown(tileId: string, key: string, mods: { shift?: boolean } = {}): boolean {
    const s = this.snapshot;
    if (s.gesture.kind === 'drag' || s.gesture.kind === 'resize') {
      if (key !== 'Escape') return false;
      this.cancelGesture();
      return true;
    }
    const tile = s.tiles.find((t) => t.id === tileId);
    if (!tile) return false;
    const km = s.keyboard;
    const mode: Capability | null = key === 'm' || key === 'M' ? 'move' : key === 'r' || key === 'R' ? 'resize' : null;

    if (km.kind === 'idle') {
      if (mode) return this.#enterKeyboard(tile, mode);
      return this.#navigate(tileId, key);
    }

    if (km.tileId !== tileId) return false;
    if (mode) {
      if (!this.can(tileId, mode)) {
        this.#announce(mode === 'move' ? s.messages.cannotMove : s.messages.cannotResize);
      } else if (mode !== km.kind) {
        this.batch(() => {
          this.update({ keyboard: { ...km, kind: mode } });
          this.#announceMode(tileId, mode);
        });
      }
      return true;
    }
    if (key === 'Enter') {
      this.#endKeyboard(true);
      return true;
    }
    if (key === 'Escape') {
      this.#endKeyboard(false);
      return true;
    }
    if (ARROWS.has(key)) {
      const resize = km.kind === 'resize' || !!mods.shift;
      if (resize) this.#resizeStep(tile, key as ArrowKey);
      else this.#moveStep(tile, key as ArrowKey);
      return true;
    }
    return false;
  }

  focus(tileId: string): void {
    this.update({ focusedTileId: tileId });
  }

  /** Focus left the tile: a keyboard mode in progress commits (D11). */
  blur(tileId: string): void {
    const km = this.snapshot.keyboard;
    if (km.kind !== 'idle' && km.tileId === tileId) this.#endKeyboard(true);
  }

  /** The single tile carrying tabindex=0. */
  get tabStop(): string | null {
    const { focusedTileId, tiles } = this.snapshot;
    if (focusedTileId && tiles.some((t) => t.id === focusedTileId)) return focusedTileId;
    return readingOrder(this.rendered)[0]?.id ?? null;
  }

  #enterKeyboard(tile: MintTile, kind: Capability): boolean {
    const { layout, messages } = this.snapshot;
    if (!this.can(tile.id, kind)) {
      // Not offered at all when the tile allows neither (PRD §6): the key falls through.
      if (!this.can(tile.id, kind === 'move' ? 'resize' : 'move')) return false;
      this.#announce(kind === 'move' ? messages.cannotMove : messages.cannotResize);
      return true;
    }
    this.batch(() => {
      this.update({ keyboard: { kind, tileId: tile.id, entry: layout }, preview: layout });
      this.#announceMode(tile.id, kind);
    });
    return true;
  }

  #announceMode(tileId: string, kind: Capability): void {
    const { messages } = this.snapshot;
    this.#announce(kind === 'move' ? messages.enterMoveMode(this.can(tileId, 'resize')) : messages.enterResizeMode(this.can(tileId, 'move')));
  }

  /**
   * One step in the arrow's direction. A step that lands on a locked tile skips
   * past it to the first cell where the pack is not blocked; "Move blocked." only
   * when no such cell exists, and the edge is announced rather than ignored.
   */
  #moveStep(tile: MintTile, key: ArrowKey): void {
    const s = this.snapshot;
    if (!this.can(tile.id, 'move')) return this.#announce(s.messages.cannotMove);
    const position = this.#position(tile.id);
    if (!position) return;
    const cols = s.columnCount;
    const { dx, dy } = direction(key);
    if (dy < 0 && position.rowStart === 1) return this.#announce(s.messages.alreadyInRow(1));
    if ((dx < 0 && position.colStart === 1) || (dx > 0 && position.colStart + position.colSpan - 1 >= cols)) {
      return this.#announce(s.messages.alreadyInColumn(position.colStart));
    }
    const base = this.rendered;
    const lastRow = base.reduce((max, e) => Math.max(max, e.position.rowStart + e.position.rowSpan - 1), 0);
    for (let k = 1; k <= Math.max(cols, lastRow) + 1; k++) {
      const rect: GridRect = { ...position, colStart: position.colStart + dx * k, rowStart: position.rowStart + dy * k };
      if (rect.colStart < 1 || rect.colStart + rect.colSpan - 1 > cols || rect.rowStart < 1) break;
      const result = this.#packAround(base, tile.id, rect);
      if (!result.blocked) return this.#applyStep(result.layout, s.messages.position(rect.colStart, cols, rect.rowStart));
    }
    this.#announce(s.messages.moveBlocked);
  }

  #resizeStep(tile: MintTile, key: ArrowKey): void {
    const s = this.snapshot;
    if (!this.can(tile.id, 'resize')) return this.#announce(s.messages.cannotResize);
    const position = this.#position(tile.id);
    if (!position) return;
    const cols = s.columnCount;
    const { dx, dy } = direction(key);
    const rect: GridRect = { ...position, colSpan: position.colSpan + dx, rowSpan: position.rowSpan + dy };
    if (rect.colSpan < 1 || rect.rowSpan < 1) return this.#announce(s.messages.minimumSize);
    if (rect.colStart + rect.colSpan - 1 > cols) return this.#announce(s.messages.maximumWidth(position.colSpan));
    const result = this.#packAround(this.rendered, tile.id, rect);
    if (result.blocked) return this.#announce(s.messages.resizeBlocked);
    this.#applyStep(result.layout, s.messages.size(rect.colSpan, rect.rowSpan));
  }

  #applyStep(layout: TileLayoutSnapshot, announcement: string): void {
    this.batch(() => {
      this.update({ preview: layout });
      this.#announce(announcement);
    });
    this.#emitPreview(layout);
  }

  #endKeyboard(commit: boolean): void {
    const { keyboard: km, preview, layout, messages } = this.snapshot;
    if (km.kind === 'idle') return;
    this.batch(() => {
      this.update({ keyboard: { kind: 'idle' }, preview: null });
      if (commit) this.#commit(preview ?? layout, km.entry);
      this.#announce(commit ? messages.committed : messages.cancelled);
      // The count was frozen while the mode ran; a change that waited is announced now.
      this.#resolve(true);
    });
    if (!commit && preview && !sameLayout(preview, km.entry)) this.#emitPreview(km.entry);
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

  // ---------------- Layouts and count ----------------

  /** Re-derive the committed layout for the current count (D5). */
  #derive(): void {
    const { layouts, tiles, columnCount } = this.snapshot;
    const next = deriveLayout(layouts, tiles, columnCount).layout;
    const current = this.snapshot.layout;
    // Order matters here: the layout lists tiles in input order.
    const unchanged = next.length === current.length && next.every((e, i) => e.id === current[i].id) && sameLayout(next, current);
    if (!unchanged) this.update({ layout: next });
  }

  /**
   * Resolve the count from the last measured width. Frozen while a gesture or a
   * keyboard mode runs, so the coordinate system never changes under the user;
   * the end of each one calls this again.
   */
  #resolve(announce: boolean): void {
    const s = this.snapshot;
    if (this.#width === null || s.gesture.kind !== 'idle' || s.keyboard.kind !== 'idle') return;
    const count = resolveColumnCount(this.#width, this.#columnOptions());
    if (s.measured && count === s.columnCount) return;
    const previous = s.measured ? s.columnCount : null;
    this.batch(() => {
      this.update({ columnCount: count, measured: true });
      this.#derive();
      if (announce && previous !== null) this.#announce(s.messages.columnCount(count));
    });
    this.#emit({ type: 'columncountchange', columnCount: count, previous });
  }

  #columnOptions(): ColumnOptions {
    const { breakpoints, stackBelow, minColumnWidth, gap, maxColumns, layouts } = this.snapshot;
    return { breakpoints, stackBelow, minColumnWidth, gap, maxColumns, layouts };
  }

  /** Store `next` for the current count and emit, unless it equals the layout on entry (D11, D12). */
  #commit(next: TileLayoutSnapshot, entry: TileLayoutSnapshot): void {
    if (sameLayout(next, entry)) return;
    const { columnCount, tiles } = this.snapshot;
    const layouts = withLayout(this.snapshot.layouts, columnCount, next, tiles);
    this.update({ layouts });
    this.#derive();
    this.#emit({ type: 'layoutchange', ...this.#payload(layouts, columnCount) });
  }

  #emitPreview(layout: TileLayoutSnapshot): void {
    const { columnCount, tiles } = this.snapshot;
    this.#emit({ type: 'layoutpreview', ...this.#payload(withLayout(this.snapshot.layouts, columnCount, layout, tiles), columnCount) });
  }

  #payload(layouts: TileLayouts, count: number): TileLayoutChange {
    return {
      columnCount: count,
      layout: layouts[count] ?? deriveLayout(layouts, this.snapshot.tiles, count).layout,
      layouts,
      staleCounts: staleCounts(layouts, count),
    };
  }

  /** After an input change: drop a gesture or keyboard mode whose tile is gone or is no longer allowed. */
  #guardInteraction(): void {
    const { gesture: g, keyboard: km } = this.snapshot;
    if (g.kind !== 'idle') {
      const capability: Capability = g.kind === 'resize' ? 'resize' : 'move';
      if (!this.can(g.tileId, capability)) this.cancelGesture();
    }
    if (km.kind !== 'idle' && !this.can(km.tileId, km.kind)) this.#endKeyboard(false);
  }

  // ---------------- Helpers ----------------

  #packAround(base: TileLayoutSnapshot, tileId: string, rect: GridRect) {
    const { tiles, columnCount } = this.snapshot;
    const locked = new Set(tiles.filter((t) => t.disableMove).map((t) => t.id));
    return pack(
      base.map((entry) => ({ id: entry.id, position: entry.position, locked: locked.has(entry.id) })),
      { id: tileId, rect },
      columnCount,
    );
  }

  #position(tileId: string): TilePosition | null {
    return this.rendered.find((e) => e.id === tileId)?.position ?? null;
  }

  #label(tile: MintTile, position: TilePosition): string {
    return tile.label ?? this.snapshot.messages.tileFallbackLabel(position.rowStart, position.colStart);
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

function direction(key: ArrowKey): { dx: number; dy: number } {
  return {
    dx: key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0,
    dy: key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0,
  };
}

/** Same ids at the same positions, order ignored. */
export function sameLayout(a: TileLayoutSnapshot, b: TileLayoutSnapshot): boolean {
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
