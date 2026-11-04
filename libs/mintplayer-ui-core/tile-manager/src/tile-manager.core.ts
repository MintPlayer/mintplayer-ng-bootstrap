import { defineCore, type CoreApi, type CoreBag } from '@mintplayer/ui-core/component';
import { connect, type StyleBag, type TileGripView, type TileTextView } from './connect';

/** A style bag without its null entries: what every front's style binding accepts. */
export type TileStyle = Record<string, string>;
const style = (bag: StyleBag): TileStyle => Object.fromEntries(Object.entries(bag).filter((e): e is [string, string] => e[1] !== null));
import { gridPointer, readCellMetrics, TileFlip } from './dom';
import type { TileManagerMessages } from './messages';
import { breakpointCss } from './ssr-css';
import {
  TileManagerMachine,
  type TileDragMode,
  type TileLayoutChange,
  type TileManagerInputPatch,
  type TilePart,
  type TileResizeMode,
} from './tile-manager-machine';
import type { MintTile, TileBreakpoint, TileGestureBlocked, TileLayouts, TileLayoutSnapshot } from './types';

/**
 * The tile manager as a D10 group (#458 M4). `TileManagerMachine` stays the
 * brain: layout per column count, gestures, keyboard and ARIA (`connect`). This
 * core hosts one machine per instance in its state, feeds it the inputs, and
 * wires the DOM the fronts used to wire by hand: delegated pointer and key
 * handlers, the grid's ResizeObserver, pointer capture and the FLIP animation.
 *
 * Server and first render: the machine is unmeasured, so tiles carry no inline
 * position and the view's `layoutCss` holds the `@container` rules that place
 * every tile at every column count (D14), rendered by `<instance-style>`.
 */

export interface TileManagerComponentInputs {
  /** The visible tiles, in DOM order. */
  tiles: readonly MintTile[];
  /** One layout per column count. Two-way: a commit writes the full next record. */
  layouts: TileLayouts;
  /** Explicit `{ minWidth, columns }` map. Wins over `stackBelow` and the generated map. */
  breakpoints: readonly TileBreakpoint[] | null;
  /** px. Below this width the tiles stack in one column. */
  stackBelow: number | null;
  /** Upper bound of the generated map when `layouts` is empty. */
  maxColumns: number;
  /** px. No column is narrower than this, except at one column. */
  minColumnWidth: number;
  /** CSS length of one grid row. */
  minRowHeight: string;
  /** px between tiles. */
  gap: number;
  dragMode: TileDragMode;
  resizeMode: TileResizeMode;
  /** Animate tiles to their new place when the layout reflows. Off under reduced motion. */
  animateReflow: boolean;
  /** Accessible name of the board. A consumer `aria-label` wins. */
  label: string | null;
  /** Localized strings for the board's descriptions and announcements. */
  messages: Partial<TileManagerMessages>;
}

/** Payload of `columnCountChange`. */
export interface TileColumnCountChange {
  columnCount: number;
  previous: number | null;
}

export interface TileManagerEvents {
  /** Each step of a gesture or keyboard move: the layout as it would be committed. */
  layoutPreview: TileLayoutChange;
  /** A commit, with the full layouts record and the stale narrower counts (D15). */
  layoutChange: TileLayoutChange;
  columnCountChange: TileColumnCountChange;
  gestureBlocked: TileGestureBlocked;
}

export interface TileManagerMethods {
  /** What is rendered: the resolved column count and its layout (the preview while editing). */
  captureLayout(): { columnCount: number; layout: TileLayoutSnapshot };
  /** Drops `layouts[count]` and commits, so that count derives again (D15). */
  resetLayout(count: number): void;
  /** True while a pointer drag or resize is in flight. */
  isGestureActive(): boolean;
}

export interface TileManagerComponentState {
  /** This instance's machine; its snapshot is read through `connect`. */
  readonly machine: TileManagerMachine;
  /** The live two-way `layouts`. */
  readonly layouts: TileLayouts;
  /** Bumped on every machine change, so the fronts re-render. */
  readonly rev: number;
}

export interface TileManagerTileView {
  readonly id: string;
  /** The consumer's tile, for the `header` and `content` slots. */
  readonly tile: MintTile;
  readonly attrs: CoreBag;
  readonly style: TileStyle;
  readonly header: CoreBag;
  readonly content: CoreBag;
  readonly grips: readonly TileGripView[];
}

export interface TileManagerView {
  readonly board: CoreBag;
  readonly container: CoreBag;
  readonly containerStyle: TileStyle;
  readonly grid: CoreBag;
  readonly gridStyle: TileStyle;
  readonly tiles: readonly TileManagerTileView[];
  readonly descriptions: readonly TileTextView[];
  readonly live: { readonly attrs: CoreBag; readonly text: string };
  /** The server layout (D14) until the first measure; null after it. */
  readonly layoutCss: string | null;
  /** The key `layoutCss` is installed under: one per board. */
  readonly layoutCssName: string;
}

/** Inputs the machine takes one-to-one; `animateReflow` is the core's own. */
const MACHINE_INPUTS = [
  'tiles', 'breakpoints', 'stackBelow', 'maxColumns', 'minColumnWidth', 'minRowHeight',
  'gap', 'dragMode', 'resizeMode', 'label', 'messages',
] as const satisfies readonly (keyof TileManagerInputPatch & keyof TileManagerComponentInputs)[];

/** The inputs each machine last received, so only a changed input is forwarded (S3). */
const pushed = new WeakMap<TileManagerMachine, Readonly<TileManagerComponentInputs>>();
/** Machines being synced from `view`: their notifications must not set state mid-render. */
const syncing = new WeakSet<TileManagerMachine>();

/**
 * Forwards the inputs that changed since the last call. Idempotent, so `view`
 * may call it on the server and on every render: an unrelated input change
 * never re-pushes a stale controlled `layouts` over the layout the machine just
 * committed, and the echo of its own commit is skipped.
 */
function syncInputs(machine: TileManagerMachine, inputs: Readonly<TileManagerComponentInputs>): void {
  const last = pushed.get(machine);
  // A copy: a front may hand the same inputs object back with its fields updated.
  pushed.set(machine, { ...inputs });
  const patch: Record<string, unknown> = Object.fromEntries(
    MACHINE_INPUTS.filter((key) => !last || !Object.is(last[key], inputs[key])).map((key) => [key, inputs[key]]),
  );
  if ((!last || !Object.is(last.layouts, inputs.layouts)) && inputs.layouts !== machine.snapshot.layouts) patch['layouts'] = inputs.layouts;
  if (!Object.keys(patch).length) return;
  syncing.add(machine);
  try {
    machine.setInputs(patch as TileManagerInputPatch);
  } finally {
    syncing.delete(machine);
  }
}

const TILE_SELECTOR = '.tile[data-tile-id]';
const GRIP_PARTS = new Set(['side', 'bottom', 'corner']);

type Api = CoreApi<TileManagerComponentInputs, TileManagerComponentState, TileManagerEvents>;

export const tileManagerCore = defineCore<
  TileManagerComponentInputs,
  TileManagerComponentState,
  { view: TileManagerView },
  TileManagerEvents,
  undefined,
  undefined,
  TileManagerMethods
>({
  state: (inputs) => ({
    machine: new TileManagerMachine({ vibrate: (ms) => globalThis.navigator?.vibrate?.(ms) }),
    layouts: inputs.layouts,
    rev: 0,
  }),
  view: ({ inputs, state, id, label }) => {
    const machine = state.machine;
    syncInputs(machine, inputs);
    const api = connect(machine, id);
    const s = machine.snapshot;
    const byId = new Map(s.tiles.map((tile) => [tile.id, tile]));
    return {
      view: {
        board: { ...api.board, class: 'mp-tile-manager', 'aria-label': label ?? api.board['aria-label'] },
        container: { ...api.container.attrs, class: 'tile-container' },
        containerStyle: style(api.container.style),
        grid: { ...api.grid.attrs, class: 'tile-grid' },
        gridStyle: style(api.grid.style),
        tiles: api.tiles.map((t) => ({
          ...t,
          tile: byId.get(t.id) as MintTile,
          attrs: { ...t.attrs, class: 'tile' },
          style: style(t.style),
          header: { ...t.header, class: 'tile-header' },
          content: { ...t.content, class: 'tile-content' },
          grips: t.grips.map((g) => ({ ...g, attrs: { ...g.attrs, class: 'tile-grip' } })),
        })),
        descriptions: api.descriptions.map((n) => ({ ...n, attrs: { ...n.attrs, class: 'tile-sr-only' } })),
        live: { ...api.live, attrs: { ...api.live.attrs, class: 'tile-sr-only' } },
        layoutCss: s.measured ? null : breakpointCss(s.layouts, s.tiles, s, id),
        layoutCssName: `tile-manager-layout-${id}`,
      },
    };
  },
  attach: (api) => attachTileManager(api),
  inputsChanged: (api) => syncInputs(api.state().machine, api.inputs()),
  methods: {
    captureLayout: (api) => {
      const machine = api.state().machine;
      return { columnCount: machine.snapshot.columnCount, layout: machine.rendered.map((p) => ({ id: p.id, position: { ...p.position } })) };
    },
    resetLayout: (api, count) => api.state().machine.resetLayout(count),
    isGestureActive: (api) => {
      const kind = api.state().machine.snapshot.gesture.kind;
      return kind === 'drag' || kind === 'resize';
    },
  },
});

function attachTileManager(api: Api): () => void {
  const machine = api.state().machine;
  const board = api.host;
  const grid = (): HTMLElement | null => board.querySelector<HTMLElement>(':scope > .tile-container > .tile-grid');

  /** This board's tile around the event target: never a nested board's. */
  const tileOf = (event: Event): HTMLElement | null => {
    // The innermost tile decides: an event from a nested board's tile is that board's.
    const tile = (event.target as Element | null)?.closest?.<HTMLElement>(TILE_SELECTOR) ?? null;
    return tile && tile.parentElement === grid() ? tile : null;
  };
  /** The innermost part pressed: a grip, the header, else the body. */
  const partOf = (event: Event, tile: HTMLElement): TilePart => {
    const part = (event.target as Element).closest<HTMLElement>('[data-part]');
    const name = part && part.closest(TILE_SELECTOR) === tile ? part.dataset['part'] : null;
    return name === 'header' ? 'header' : name && GRIP_PARTS.has(name) ? (name as TilePart) : 'body';
  };

  // ---- the machine → the fronts ----
  const flip = new TileFlip();
  let flipPending = false;
  let lastRendered = machine.rendered;
  let focusSeq = machine.snapshot.focusRequest?.seq ?? 0;
  const offState = machine.subscribe(() => {
    // FLIP "first": read now, before the front writes the new positions.
    const rendered = machine.rendered;
    if (rendered !== lastRendered) {
      lastRendered = rendered;
      const own = grid();
      if (own && api.inputs().animateReflow && machine.snapshot.measured) {
        flip.first(own);
        flipPending = true;
      }
    }
    const request = machine.snapshot.focusRequest;
    if (request && request.seq !== focusSeq) {
      focusSeq = request.seq;
      queueMicrotask(() => grid()?.querySelectorAll<HTMLElement>(`:scope > ${TILE_SELECTOR}`).forEach((el) => el.dataset['tileId'] === request.tileId && el.focus()));
    }
    if (!syncing.has(machine)) api.setState({ rev: api.state().rev + 1 });
  });
  // FLIP "play": once the front has written the new positions.
  const positions = new MutationObserver(() => {
    const own = grid();
    if (!flipPending || !own) return;
    flipPending = false;
    const g = machine.snapshot.gesture;
    flip.play(own, g.kind === 'drag' ? g.tileId : null);
  });
  const own = grid();
  if (own) positions.observe(own, { attributes: true, attributeFilter: ['style'], subtree: true });

  const offEvents = machine.onEvent((event) => {
    const fire = () => {
      switch (event.type) {
        case 'layoutchange': {
          const { type: _, ...change } = event;
          api.setState({ layouts: change.layouts });
          api.emit('layoutChange', change);
          break;
        }
        case 'layoutpreview': {
          const { type: _, ...change } = event;
          api.emit('layoutPreview', change);
          break;
        }
        case 'columncountchange':
          api.emit('columnCountChange', { columnCount: event.columnCount, previous: event.previous });
          break;
        case 'gestureblocked': {
          const { type: _, ...blocked } = event;
          api.emit('gestureBlocked', blocked);
          break;
        }
      }
    };
    // An input pushed while rendering fires after the render, not inside it.
    if (syncing.has(machine)) queueMicrotask(fire);
    else fire();
  });

  // ---- the DOM → the machine (delegated: the tiles are re-rendered freely) ----
  const onPointerDown = (event: PointerEvent) => {
    const tile = tileOf(event);
    const target = grid();
    if (!tile || !target) return;
    const verdict = machine.pointerDown(tile.dataset['tileId'] ?? '', partOf(event, tile), gridPointer(event, target), readCellMetrics(target, machine.snapshot.columnCount));
    if (verdict === 'capture') {
      event.preventDefault();
      tile.setPointerCapture(event.pointerId);
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    const tile = tileOf(event);
    const target = grid();
    if (tile && target && machine.pointerMove(gridPointer(event, target)) === 'capture') tile.setPointerCapture(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent) => {
    if (tileOf(event)) machine.pointerUp(event);
  };
  const onPointerCancel = (event: PointerEvent) => {
    if (tileOf(event)) machine.pointerCancel(event);
  };
  const onKeydown = (event: KeyboardEvent) => {
    const tile = tileOf(event);
    if (tile && machine.keydown(tile.dataset['tileId'] ?? '', event.key, { shift: event.shiftKey })) event.preventDefault();
  };
  // The tile itself, not its content: focus does not bubble, so focusin/out filter on the target.
  const onFocusIn = (event: FocusEvent) => {
    const tile = tileOf(event);
    if (tile && tile === event.target) machine.focus(tile.dataset['tileId'] ?? '');
  };
  const onFocusOut = (event: FocusEvent) => {
    const tile = tileOf(event);
    if (tile && tile === event.target) machine.blur(tile.dataset['tileId'] ?? '');
  };
  const listeners = [
    ['pointerdown', onPointerDown],
    ['pointermove', onPointerMove],
    ['pointerup', onPointerUp],
    ['pointercancel', onPointerCancel],
    ['lostpointercapture', onPointerCancel],
    ['keydown', onKeydown],
    ['focusin', onFocusIn],
    ['focusout', onFocusOut],
  ] as const;
  listeners.forEach(([type, handler]) => board.addEventListener(type, handler as EventListener));

  // One observer on the grid; `measure` runs in the next frame, never inside the callback (S2).
  let width = 0;
  let frame = 0;
  const resize =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          const entry = entries[entries.length - 1];
          width = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            machine.measure(width);
          });
        });
  if (own) resize?.observe(own);
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') machine.cancelGesture();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    listeners.forEach(([type, handler]) => board.removeEventListener(type, handler as EventListener));
    document.removeEventListener('visibilitychange', onVisibilityChange);
    resize?.disconnect();
    positions.disconnect();
    if (frame) cancelAnimationFrame(frame);
    machine.cancelGesture();
    offEvents();
    offState();
  };
}
