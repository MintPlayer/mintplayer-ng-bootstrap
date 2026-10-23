import type { CellMetrics } from './grid-geometry';
import type { TilePointer } from './tile-manager-machine';

/**
 * The only DOM the fronts share: reading numbers for the machine and the FLIP
 * reflow. Every function takes the element it reads, so each front decides how
 * it finds its own grid (a ref, a viewChild, a query in its shadow root).
 */

/** A pointer event in grid-local coordinates. One rect read per call. */
export function gridPointer(event: PointerEvent, grid: Element): TilePointer {
  const rect = grid.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    button: event.button,
    buttons: event.buttons,
  };
}

/** Cell size and gaps, read once at pointerdown. */
export function readCellMetrics(grid: Element, columnCount: number): CellMetrics {
  const cs = getComputedStyle(grid);
  const rect = grid.getBoundingClientRect();
  const gapX = parseFloat(cs.columnGap) || 0;
  const gapY = parseFloat(cs.rowGap) || 0;
  return {
    width: (rect.width - (columnCount - 1) * gapX) / columnCount,
    height: parseFloat(cs.gridAutoRows) || rect.width / columnCount,
    gapX,
    gapY,
  };
}

/**
 * FLIP for tile reflow (S5: position only, 250 ms). Call `first()` before the
 * framework writes the new positions and `play()` after it has.
 */
export class TileFlip {
  #first = new Map<string, DOMRect>();

  first(grid: Element): void {
    // Read before cancelling, so an interrupted animation continues from where the tile is on screen.
    this.#first = new Map(tilesOf(grid).map((el) => [el.dataset['tileId'] ?? '', el.getBoundingClientRect()]));
    tilesOf(grid).forEach((el) => el.getAnimations?.().forEach((a) => a.cancel()));
  }

  /** `skipId`: the tile under the pointer, which follows the pointer instead. */
  play(grid: Element, skipId: string | null = null): void {
    const first = this.#first;
    this.#first = new Map();
    if (first.size === 0 || typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    tilesOf(grid).forEach((el) => {
      const id = el.dataset['tileId'] ?? '';
      const before = first.get(id);
      if (!before || id === skipId) return;
      const after = el.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.animate?.([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 250, easing: 'cubic-bezier(.2,.7,.3,1)' });
    });
  }
}

function tilesOf(grid: Element): HTMLElement[] {
  return Array.from(grid.querySelectorAll<HTMLElement>(':scope > [data-tile-id]'));
}
