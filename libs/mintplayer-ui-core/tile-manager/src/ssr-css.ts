import { resolveBreakpoints, resolveColumnCount, type ColumnOptions } from './columns';
import { deriveLayout } from './derive';
import type { MintTile, TileLayouts } from './types';

/**
 * The server-side `<style>` that paints the right layout without JS (D14, PRD §5.4). One block
 * per width where the resolved count changes: the grid's track template and every tile's
 * placement, from the same `deriveLayout` the client renders, so both agree. The narrowest
 * block is unconditional; the rest are `@container (min-width: Wpx)`, which `.tile-container`
 * answers. Rules are scoped to the board's id, so two boards on one page do not collide.
 *
 * Widths come from the breakpoint map AND from the `minColumnWidth` fit, since the count is
 * `min(breakpoint, fit)` (D2) and can change at either.
 */
export function breakpointCss(layouts: TileLayouts | null | undefined, tiles: readonly MintTile[], options: ColumnOptions, rootId: string): string {
  const breakpoints = resolveBreakpoints(options);
  const widest = Math.max(...breakpoints.map((b) => b.columns));
  // Every count up to the widest can be reached through the fit, not only the counts in the map.
  const fitWidths = Array.from({ length: widest }, (_, i) => (i + 1) * options.minColumnWidth + i * options.gap);
  const widths = [...new Set([0, ...breakpoints.map((b) => b.minWidth), ...fitWidths])].sort((a, b) => a - b);
  const steps = widths
    .map((width) => ({ width, columns: resolveColumnCount(width, options) }))
    .filter((step, i, all) => i === 0 || step.columns !== all[i - 1].columns);

  const board = `#${cssIdent(rootId)}`;
  return steps
    .map(({ width, columns }) => {
      const rules = [
        `${board} .tile-grid[data-mps=tile-manager]{grid-template-columns:repeat(${columns},minmax(0,1fr))}`,
        ...deriveLayout(layouts, tiles, columns).layout.map(
          ({ id, position: p }) =>
            `${board} .tile[data-mps=tile-manager][data-tile-id="${cssString(id)}"]{grid-column:${p.colStart} / span ${p.colSpan};grid-row:${p.rowStart} / span ${p.rowSpan}}`,
        ),
      ].join('');
      return width === 0 ? rules : `@container (min-width: ${width}px){${rules}}`;
    })
    .join('\n');
}

/** CSS.escape is not available on the server. Anything outside [A-Za-z0-9_-] becomes a hex escape. */
function cssIdent(value: string): string {
  return value.replace(/^-?\d|[^A-Za-z0-9_-]/g, (ch) => [...ch].map((c) => `\\${c.codePointAt(0)?.toString(16)} `).join(''));
}

/** Inside a double-quoted CSS string. `<` is escaped too, so an id cannot close the `<style>`. */
function cssString(value: string): string {
  return value.replace(/["\\<\n\r]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);
}
