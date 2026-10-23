import type { ResizeHandle } from './grid-geometry';
import type { TileManagerMachine } from './tile-manager-machine';

/** An attribute bag. `null` means "attribute absent"; `true` means present and empty. */
export type AttrBag = Record<string, string | boolean | null>;

export const TILE_MANAGER_SCOPE = 'tile-manager';

/**
 * Inline style, kebab-case (custom properties included). Kept out of the attribute
 * bag: Angular's `[mpProps]` refuses `style` by design, and every framework has its
 * own style binding (`[style]`, `styleMap`, `:style`, React `style`).
 */
export type StyleBag = Record<string, string | null>;

export interface TileGripView {
  handle: ResizeHandle;
  attrs: AttrBag;
}

export interface TileView {
  id: string;
  attrs: AttrBag;
  style: StyleBag;
  /** The header node: it names the tile when there is no `label`, and is the drag handle in `dragMode: 'header'`. */
  header: AttrBag;
  content: AttrBag;
  /** Empty when this tile cannot be resized, and before the first measure: the grips are not rendered at all. */
  grips: TileGripView[];
}

/** A visually hidden node: the board description or one per-capability instruction. */
export interface TileTextView {
  key: string;
  attrs: AttrBag;
  text: string;
}

export interface TileManagerApi {
  board: { attrs: AttrBag; style: StyleBag };
  container: AttrBag;
  grid: { attrs: AttrBag; style: StyleBag };
  /** Tiles in the `tiles` input order, stable across gestures; position comes from the rendered layout. */
  tiles: TileView[];
  /** Rendered after the grid, in this order, with `visually-hidden`. Keyed for list rendering. */
  descriptions: TileTextView[];
  live: { attrs: AttrBag; text: string };
}

type Capabilities = 'both' | 'move' | 'resize' | 'none';

const GRIPS: readonly ResizeHandle[] = ['side', 'bottom', 'corner'];

export function tileManagerIds(rootId: string) {
  return {
    board: rootId,
    description: `${rootId}-description`,
    instructions: (capabilities: Capabilities) => `${rootId}-instructions-${capabilities}`,
    header: (tileId: string) => `${rootId}-header-${idPart(tileId)}`,
  };
}

/**
 * Every attribute the four fronts write, from one machine (PRD §5.1, §5.2, §6). Pure in
 * the machine's snapshot: the same state gives the same bags, which keeps the fronts identical.
 *
 * Before the first `measure()` (the server, and the client until it has measured) the board is
 * the Tier 2 no-JS render: no inline position or track template (D14, the `breakpointCss` rules
 * place everything), and no editing affordance. Tiles are named groups, not buttons; there
 * are no grips, no tab stop and no instructions.
 */
export function connect(machine: TileManagerMachine, rootId: string): TileManagerApi {
  const s = machine.snapshot;
  const scope = { 'data-mps': TILE_MANAGER_SCOPE };
  const ids = tileManagerIds(rootId);
  const live = s.measured;
  const tabStop = live ? machine.tabStop : null;
  const positionById = new Map(machine.rendered.map((e) => [e.id, e.position]));
  const g = s.gesture;
  const active = g.kind === 'idle' ? null : g.tileId;
  const cell = s.cell;

  const capabilitiesOf = (id: string): Capabilities => {
    const move = machine.can(id, 'move');
    const resize = machine.can(id, 'resize');
    return move && resize ? 'both' : move ? 'move' : resize ? 'resize' : 'none';
  };

  // Stable DOM order (the tiles input), never the preview's: a framework that reorders nodes
  // mid-gesture detaches the dragged tile, which drops its pointer capture and its focus (S3).
  const tiles = s.tiles.flatMap((tile): TileView[] => {
    const id = tile.id;
    const position = positionById.get(id);
    if (!position) return [];
    const capabilities = capabilitiesOf(id);
    const canMove = capabilities === 'both' || capabilities === 'move';
    const canResize = capabilities === 'both' || capabilities === 'resize';
    const dragging = g.kind === 'drag' && active === id;
    const resizing = g.kind === 'resize' && active === id;
    const blocked = (g.kind === 'drag' || g.kind === 'resize') && active === id && g.blocked;
    const mode = s.keyboard.kind !== 'idle' && s.keyboard.tileId === id ? s.keyboard.kind : null;
    const offset = machine.dragOffset(id);
    // During a pointer resize the tile carries pixel width/height so its size can transition between spans.
    const px = resizing && cell ? { w: position.colSpan * cell.width + (position.colSpan - 1) * cell.gapX, h: position.rowSpan * cell.height + (position.rowSpan - 1) * cell.gapY } : null;
    const name = tile.label ? { 'aria-label': tile.label, 'aria-labelledby': null } : { 'aria-label': null, 'aria-labelledby': ids.header(id) };

    return [
      {
        id,
        attrs: {
          ...scope,
          ...name,
          role: live ? 'button' : 'group',
          'aria-roledescription': s.messages.tileRoleDescription,
          tabindex: live ? (tabStop === id ? '0' : '-1') : null,
          'aria-pressed': live ? String(mode !== null) : null,
          'aria-describedby': live ? ids.instructions(capabilities) : null,
          'data-tile-id': id,
          'data-mode': mode,
          'data-draggable': live && canMove && s.dragMode === 'tile' ? true : null,
          'data-dragging': dragging || null,
          'data-resizing': resizing || null,
          'data-blocked': blocked || null,
          'data-pressing': (g.kind === 'pending' && g.touch && g.pressing && active === id) || null,
        },
        style: live
          ? {
              'grid-column': `${position.colStart} / span ${position.colSpan}`,
              'grid-row': `${position.rowStart} / span ${position.rowSpan}`,
              transform: offset ? `translate(${offset.x}px, ${offset.y}px)` : null,
              width: px ? `${px.w}px` : null,
              height: px ? `${px.h}px` : null,
            }
          : {},
        header: {
          ...scope,
          id: ids.header(id),
          'data-part': 'header',
          'data-drag-handle': live && canMove && s.dragMode === 'header' ? true : null,
        },
        content: { ...scope, 'data-part': 'body' },
        // Decorative: R mode is the keyboard equivalent, and the tile's instructions say so.
        grips: live && canResize ? GRIPS.map((handle) => ({ handle, attrs: { ...scope, 'data-part': handle, 'aria-hidden': 'true' } })) : [],
      },
    ];
  });

  const used = live ? [...new Set(tiles.map((t) => capabilitiesOf(t.id)))] : [];
  const readOnly = !live || used.every((c) => c === 'none');

  return {
    board: {
      attrs: {
        ...scope,
        id: ids.board,
        role: 'region',
        'aria-label': s.label ?? s.messages.boardLabel,
        'aria-describedby': ids.description,
        'data-resize-mode': s.resizeMode,
      },
      // Not positions: the floors and the row track are safe on the server (D14).
      style: {
        '--mp-tile-min-column': `${s.minColumnWidth}px`,
        '--mp-tile-gap': `${s.gap}px`,
        '--mp-tile-row-height': s.minRowHeight,
      },
    },
    container: { ...scope },
    grid: { attrs: { ...scope }, style: live ? { 'grid-template-columns': `repeat(${s.columnCount}, minmax(0, 1fr))` } : {} },
    tiles,
    descriptions: [
      { key: 'description', attrs: { ...scope, id: ids.description }, text: s.messages.boardDescription(live ? s.columnCount : null, readOnly) },
      ...(['both', 'move', 'resize', 'none'] as const)
        .filter((c) => used.includes(c))
        .map((c) => ({ key: c, attrs: { ...scope, id: ids.instructions(c) }, text: s.messages.instructions(c === 'both' || c === 'move', c === 'both' || c === 'resize') })),
    ],
    live: { attrs: { ...scope, role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, text: s.announcement.text },
  };
}

/** A tile id inside an IDREF: anything outside [A-Za-z0-9-] (the underscore included) becomes `_hex_`, so distinct ids stay distinct. */
function idPart(value: string): string {
  return value.replace(/[^A-Za-z0-9-]/g, (c) => `_${c.codePointAt(0)?.toString(16)}_`);
}
