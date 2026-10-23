import * as React from 'react';
import { useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  breakpointCss,
  connect,
  DEFAULT_GAP,
  DEFAULT_MIN_COLUMN_WIDTH,
  gridPointer,
  readCellMetrics,
  TILE_MANAGER_SCOPE,
  TileFlip,
  TileManagerMachine,
  tileManagerScopedStyles,
  type MintTile,
  type TileBreakpoint,
  type TileDragMode,
  type TileGestureBlocked,
  type TileLayoutChange,
  type TileLayouts,
  type TileLayoutSnapshot,
  type TileManagerMessages,
  type TilePart,
  type TileResizeMode,
} from '@mintplayer/ui-core/tile-manager';
import { useMachine } from '../../machine/src/useMachine';
import { reactProps, reactStyle } from '../../machine/src/react-props';

/** Payload of `onColumnCountChange`. */
export interface BsTileColumnCountChange {
  columnCount: number;
  previous: number | null;
}

/** What a `ref` on `<BsTileManager>` exposes. */
export interface BsTileManagerHandle {
  /** What is rendered: the resolved column count and its layout (the preview while editing). */
  captureLayout(): { columnCount: number; layout: TileLayoutSnapshot };
  /** Drops `layouts[count]` and commits, so that count derives again (D15). */
  resetLayout(count: number): void;
  /** True while a pointer drag or resize is in flight. */
  readonly isGestureActive: boolean;
}

type BoardAttributes = Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'role' | 'defaultValue'>;

export interface BsTileManagerProps<T extends MintTile = MintTile> extends BoardAttributes {
  ref?: React.Ref<BsTileManagerHandle>;
  /** The visible tiles, in DOM order. */
  tiles: readonly T[];
  /** Renders a tile's header. */
  renderHeader?: (tile: T) => React.ReactNode;
  /** Renders a tile's body. */
  renderContent?: (tile: T) => React.ReactNode;
  /** Controlled: one layout per column count. Pair with `onLayoutsChange`. */
  layouts?: TileLayouts;
  /** Uncontrolled initial layouts. */
  defaultLayouts?: TileLayouts;
  /** A commit wrote the full next layouts record. */
  onLayoutsChange?: (layouts: TileLayouts) => void;
  /** Explicit `{ minWidth, columns }` map. Wins over `stackBelow` and the generated map. */
  breakpoints?: readonly TileBreakpoint[] | null;
  /** px. Below this width the tiles stack in one column. */
  stackBelow?: number | null;
  /** Upper bound of the generated map when `layouts` is empty. */
  maxColumns?: number;
  /** px. No column is narrower than this, except at one column. */
  minColumnWidth?: number;
  /** CSS length of one grid row. */
  minRowHeight?: string;
  /** px between tiles. */
  gap?: number;
  dragMode?: TileDragMode;
  resizeMode?: TileResizeMode;
  /** Animate tiles to their new place when the layout reflows. Off under reduced motion. */
  animateReflow?: boolean;
  /** Accessible name of the board. An `aria-label` / `aria-labelledby` prop wins. */
  label?: string | null;
  /** Localized strings for the board's descriptions and announcements. */
  messages?: Partial<TileManagerMessages>;
  /** Each step of a gesture or keyboard move: the layout as it would be committed. */
  onLayoutPreview?: (change: TileLayoutChange) => void;
  /** A commit, with the full layouts record and the stale narrower counts (D15). */
  onLayoutChange?: (change: TileLayoutChange) => void;
  onColumnCountChange?: (change: BsTileColumnCountChange) => void;
  onGestureBlocked?: (blocked: TileGestureBlocked) => void;
}

const NO_MESSAGES: Partial<TileManagerMessages> = {};

/**
 * Tile manager: a dashboard grid whose tiles the user moves and resizes, with one layout per
 * column count (#440).
 *
 * The React front of `TileManagerMachine` (`@mintplayer/ui-core/tile-manager`). Every decision
 * (layout per column count, gestures, keyboard, ARIA) is the machine's; this component renders
 * its own JSX from `connect()`'s bags, measures the grid, owns pointer capture and the FLIP
 * animation, and turns the machine's events into callbacks. Consumer props land on the board,
 * whose `region` role is part of the contract.
 *
 * SSR: until the first measure the board carries a `<style>` with the `@container` rules that
 * place every tile at every column count (D14), so the server HTML paints the right layout with
 * no JS. No-JS tier 2: before the first measure the tiles are named groups with no tab stop or
 * grips.
 */
export function BsTileManager<T extends MintTile = MintTile>(props: BsTileManagerProps<T>): React.ReactElement {
  const {
    ref,
    tiles,
    renderHeader,
    renderContent,
    layouts,
    defaultLayouts,
    onLayoutsChange,
    breakpoints = null,
    stackBelow = null,
    maxColumns = 6,
    minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
    minRowHeight = '8rem',
    gap = DEFAULT_GAP,
    dragMode = 'header',
    resizeMode = 'hover',
    animateReflow = true,
    label = null,
    messages = NO_MESSAGES,
    onLayoutPreview,
    onLayoutChange,
    onColumnCountChange,
    onGestureBlocked,
    className,
    style,
    'aria-describedby': describedBy,
    ...rest
  } = props;

  // Latest callbacks without re-creating the machine: its events call through this ref.
  const callbacks = useRef({ onLayoutsChange, onLayoutPreview, onLayoutChange, onColumnCountChange, onGestureBlocked });
  callbacks.current = { onLayoutsChange, onLayoutPreview, onLayoutChange, onColumnCountChange, onGestureBlocked };
  const animate = useRef(animateReflow);
  animate.current = animateReflow;

  const reactId = useId();
  const id = `bs-tile-manager-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // Every input goes in at construction, so the server render and the first client render agree.
  const [machine, state] = useMachine(() => {
    const created = new TileManagerMachine({ vibrate: (ms) => navigator.vibrate?.(ms) });
    created.setInputs({
      tiles, layouts: layouts ?? defaultLayouts ?? {}, breakpoints, stackBelow, maxColumns, minColumnWidth, minRowHeight, gap, dragMode, resizeMode, label, messages,
    });
    return created;
  });

  installLightStyles(TILE_MANAGER_SCOPE, tileManagerScopedStyles);

  // Props → machine. One effect per input, so an unrelated prop change never re-pushes a
  // stale controlled `layouts` over the layout the machine just committed (S3).
  useEffect(() => machine.setInputs({ tiles }), [machine, tiles]);
  useEffect(() => machine.setInputs({ breakpoints }), [machine, breakpoints]);
  useEffect(() => machine.setInputs({ stackBelow }), [machine, stackBelow]);
  useEffect(() => machine.setInputs({ maxColumns }), [machine, maxColumns]);
  useEffect(() => machine.setInputs({ minColumnWidth }), [machine, minColumnWidth]);
  useEffect(() => machine.setInputs({ minRowHeight }), [machine, minRowHeight]);
  useEffect(() => machine.setInputs({ gap }), [machine, gap]);
  useEffect(() => machine.setInputs({ dragMode }), [machine, dragMode]);
  useEffect(() => machine.setInputs({ resizeMode }), [machine, resizeMode]);
  useEffect(() => machine.setInputs({ label }), [machine, label]);
  useEffect(() => machine.setInputs({ messages }), [machine, messages]);
  // A consumer write to a controlled `layouts`, not the echo of our own commit.
  useEffect(() => {
    if (layouts !== undefined && layouts !== machine.snapshot.layouts) machine.setInputs({ layouts });
  }, [machine, layouts]);

  useEffect(
    () =>
      machine.onEvent((e) => {
        const { type, ...detail } = e;
        switch (type) {
          case 'layoutchange': {
            const change = detail as TileLayoutChange;
            callbacks.current.onLayoutsChange?.(change.layouts);
            callbacks.current.onLayoutChange?.(change);
            break;
          }
          case 'layoutpreview':
            callbacks.current.onLayoutPreview?.(detail as TileLayoutChange);
            break;
          case 'columncountchange':
            callbacks.current.onColumnCountChange?.(detail as BsTileColumnCountChange);
            break;
          case 'gestureblocked':
            callbacks.current.onGestureBlocked?.(detail as TileGestureBlocked);
            break;
        }
      }),
    [machine],
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const flip = useMemo(() => new TileFlip(), []);
  const pending = useRef({ flip: false, focusSeq: 0, lastRendered: null as TileLayoutSnapshot | null });

  // FLIP "first": read in the store notification, before React writes the new positions.
  useEffect(
    () =>
      machine.subscribe(() => {
        const rendered = machine.rendered;
        if (rendered === pending.current.lastRendered) return;
        pending.current.lastRendered = rendered;
        const grid = gridRef.current;
        if (grid && animate.current && machine.snapshot.measured) {
          flip.first(grid);
          pending.current.flip = true;
        }
      }),
    [machine, flip],
  );

  // FLIP "play" and the machine's focus requests, once the new DOM is committed.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (pending.current.flip && grid) {
      pending.current.flip = false;
      flip.play(grid, state.gesture.kind === 'drag' ? state.gesture.tileId : null);
    }
    if (state.focusRequest && state.focusRequest.seq !== pending.current.focusSeq) {
      pending.current.focusSeq = state.focusRequest.seq;
      boardRef.current?.querySelector<HTMLElement>(`[data-tile-id="${CSS.escape(state.focusRequest.tileId)}"]`)?.focus();
    }
  }, [state, flip]);

  // One observer on the grid; `measure` runs in the next frame, never inside the callback (S2).
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    let width = 0;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      width = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        machine.measure(width);
      });
    });
    observer.observe(grid);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') machine.cancelGesture();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [machine]);

  useImperativeHandle(
    ref,
    () => ({
      captureLayout: () => ({ columnCount: machine.snapshot.columnCount, layout: machine.rendered.map((p) => ({ id: p.id, position: { ...p.position } })) }),
      resetLayout: (count) => machine.resetLayout(count),
      get isGestureActive() {
        const kind = machine.snapshot.gesture.kind;
        return kind === 'drag' || kind === 'resize';
      },
    }),
    [machine],
  );

  const down = (e: React.PointerEvent, tileId: string, part: TilePart) => {
    const grid = gridRef.current;
    if (!grid) return;
    const verdict = machine.pointerDown(tileId, part, gridPointer(e.nativeEvent, grid), readCellMetrics(grid, machine.snapshot.columnCount));
    if (verdict === 'capture') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-tile-id]')?.setPointerCapture(e.pointerId);
    }
  };
  const move = (e: React.PointerEvent) => {
    const grid = gridRef.current;
    if (grid && machine.pointerMove(gridPointer(e.nativeEvent, grid)) === 'capture') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const api = connect(machine, id);
  const tileById = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  const layoutCss = useMemo(() => (state.measured ? null : breakpointCss(state.layouts, state.tiles, state, id)), [state, id]);
  const { class: boardClass, 'aria-describedby': boardDescribedBy, ...boardAttrs } = api.board.attrs;

  return (
    <div
      ref={boardRef}
      {...reactProps(boardAttrs)}
      {...rest}
      className={['mp-tile-manager', boardClass, className].filter(Boolean).join(' ')}
      role="region"
      aria-describedby={[boardDescribedBy, describedBy].filter(Boolean).join(' ') || undefined}
      style={{ ...reactStyle(api.board.style), ...style }}
    >
      {layoutCss && <style>{layoutCss}</style>}
      <div className="tile-container" {...reactProps(api.container)}>
        <div ref={gridRef} className="tile-grid" {...reactProps(api.grid.attrs)} style={reactStyle(api.grid.style)}>
          {/* A press on the header or a grip bubbles to the tile's body handler; the machine
              ignores that second pointerdown for the same pointer, so the innermost part decides. */}
          {api.tiles.map((t) => {
            const tile = tileById.get(t.id);
            return (
              <div
                key={t.id}
                className="tile"
                {...reactProps(t.attrs)}
                style={reactStyle(t.style)}
                onPointerDown={(e) => down(e, t.id, 'body')}
                onPointerMove={move}
                onPointerUp={(e) => machine.pointerUp(e.nativeEvent)}
                onPointerCancel={(e) => machine.pointerCancel(e.nativeEvent)}
                onLostPointerCapture={(e) => machine.pointerCancel(e.nativeEvent)}
                onKeyDown={(e) => {
                  if (machine.keydown(t.id, e.key, { shift: e.shiftKey })) e.preventDefault();
                }}
                // React's focus/blur bubble; only the tile itself moving focus counts.
                onFocus={(e) => e.target === e.currentTarget && machine.focus(t.id)}
                onBlur={(e) => e.target === e.currentTarget && machine.blur(t.id)}
              >
                <div className="tile-header" {...reactProps(t.header)} onPointerDown={(e) => down(e, t.id, 'header')}>
                  {tile && renderHeader?.(tile)}
                </div>
                <div className="tile-content" {...reactProps(t.content)}>
                  {tile && renderContent?.(tile)}
                </div>
                {t.grips.map((g) => (
                  <span key={g.handle} className="tile-grip" {...reactProps(g.attrs)} onPointerDown={(e) => down(e, t.id, g.handle)} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {api.descriptions.map((n) => (
        <div key={n.key} className="tile-sr-only" {...reactProps(n.attrs)}>
          {n.text}
        </div>
      ))}
      <span className="tile-sr-only" {...reactProps(api.live.attrs)}>
        {api.live.text}
      </span>
    </div>
  );
}
