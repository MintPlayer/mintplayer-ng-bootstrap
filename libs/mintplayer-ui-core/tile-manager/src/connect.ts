import type { ResizeHandle } from './grid-geometry';
import type { TileManagerMachine } from './tile-manager-machine';

/** An attribute bag. `null` means "attribute absent"; `true` means present and empty. */
export type AttrBag = Record<string, string | boolean | null>;

export const TILE_MANAGER_SCOPE = 'tile-manager';

/**
 * Inline style for a tile, kebab-case. Kept out of the attribute bag: Angular's
 * `[mpProps]` refuses `style` by design, and every framework has its own style
 * binding (`[style]`, `styleMap`, `:style`, React `style`).
 */
export type StyleBag = Record<string, string | null>;

export interface TileView {
  id: string;
  attrs: AttrBag;
  style: StyleBag;
  header: AttrBag;
  /** Empty when this tile cannot be resized: the grips are not rendered at all. */
  grips: ResizeHandle[];
}

export interface TileManagerApi {
  board: AttrBag;
  grid: { attrs: AttrBag; style: StyleBag };
  /** Tiles in the `tiles` input order, stable across gestures; position comes from the rendered layout. */
  tiles: TileView[];
  instructions: { attrs: AttrBag; text: string };
  live: { attrs: AttrBag; text: string };
}

const INSTRUCTIONS =
  'Press M to enter move mode. In move mode, arrow keys move the tile, Shift with arrow keys resize it, Enter commits, Escape cancels.';

/** S3 PROTOTYPE of the M3 connect(): reads the machine (snapshot plus derived getters), writes every attribute. */
export function connect(machine: TileManagerMachine, rootId: string): TileManagerApi {
  const s = machine.snapshot;
  const scope = { 'data-mps': TILE_MANAGER_SCOPE };
  const instructionsId = `${rootId}-instructions`;
  const tabStop = machine.tabStop;
  const positionById = new Map(machine.rendered.map((e) => [e.id, e.position]));
  const g = s.gesture;
  const active = g.kind === 'idle' ? null : g.tileId;

  // Stable DOM order (the tiles input), never the preview's: a framework that reorders nodes
  // mid-gesture detaches the dragged tile, which drops its pointer capture and its focus (S3).
  const tiles = s.tiles.flatMap((tile): TileView[] => {
    const id = tile.id;
    const position = positionById.get(id);
    if (!position) return [];
    const dragging = g.kind === 'drag' && active === id;
    const resizing = g.kind === 'resize' && active === id;
    const offset = machine.dragOffset(id);
    const cell = s.cell;
    // During a pointer resize the tile carries pixel width/height so its size can transition between spans.
    const px = resizing && cell ? { w: position.colSpan * cell.width + (position.colSpan - 1) * cell.gapX, h: position.rowSpan * cell.height + (position.rowSpan - 1) * cell.gapY } : null;
    return [
      {
        id,
        attrs: {
          ...scope,
          role: 'button',
          tabindex: tabStop === id ? '0' : '-1',
          'aria-pressed': String(s.keyboard.kind === 'move' && s.keyboard.tileId === id),
          'aria-describedby': instructionsId,
          'aria-label': tile.label ?? null,
          'data-tile-id': id,
          'data-dragging': String(dragging),
          'data-resizing': String(resizing),
          'data-blocked': String((dragging || resizing) && (g.kind === 'drag' || g.kind === 'resize') && g.blocked),
          'data-pressing': String(g.kind === 'pending' && g.touch && g.pressing && active === id),
          'data-drag-mode': s.dragMode,
        },
        style: {
          'grid-column': `${position.colStart} / span ${position.colSpan}`,
          'grid-row': `${position.rowStart} / span ${position.rowSpan}`,
          transform: offset ? `translate(${offset.x}px, ${offset.y}px)` : null,
          width: px ? `${px.w}px` : null,
          height: px ? `${px.h}px` : null,
        },
        header: { ...scope, 'data-part': 'header' },
        grips: s.resizeMode === 'off' || tile.disableResize ? [] : ['side', 'bottom', 'corner'],
      },
    ];
  });

  return {
    board: { ...scope, role: 'region', 'aria-label': 'Tile board' },
    grid: { attrs: { ...scope }, style: { 'grid-template-columns': `repeat(${s.columnCount}, minmax(0, 1fr))` } },
    tiles,
    instructions: { attrs: { ...scope, id: instructionsId }, text: INSTRUCTIONS },
    live: { attrs: { ...scope, role: 'status', 'aria-live': 'polite' }, text: s.announcement.text },
  };
}
