import type { TileBreakpoint, TileLayouts } from './types';

export const DEFAULT_MAX_COLUMNS = 6;

export interface ColumnOptions {
  /** Explicit map (D1). Wins over `stackBelow` and over the generated map. */
  breakpoints?: readonly TileBreakpoint[] | null;
  /** Sugar for `[{ minWidth: 0, columns: 1 }, { minWidth: stackBelow, columns: max }]` (D1). */
  stackBelow?: number | null;
  /** px. No tile is ever narrower than this, except at 1 column (G1). */
  minColumnWidth: number;
  /** px between columns. */
  gap: number;
  /** Upper bound of the generated map when `layouts` is empty (D3). */
  maxColumns?: number;
  /** The largest stored count raises the generated map's upper bound (D3). */
  layouts?: TileLayouts | null;
}

/** How many columns of at least `minColumnWidth` fit in `width`, never below 1 (D2). */
export function fitColumns(width: number, minColumnWidth: number, gap: number): number {
  return Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)));
}

/** The widest count the board offers: the largest stored count, else `maxColumns` (D3). */
export function maxColumnCount(options: Pick<ColumnOptions, 'layouts' | 'maxColumns'>): number {
  const stored = storedCounts(options.layouts);
  return stored.length ? stored[stored.length - 1] : Math.max(1, options.maxColumns ?? DEFAULT_MAX_COLUMNS);
}

/** One entry per count `1…max`, each at the width where that many minimum-width columns fit (D3). */
export function generateBreakpoints(options: ColumnOptions): TileBreakpoint[] {
  const { minColumnWidth, gap } = options;
  return Array.from({ length: maxColumnCount(options) }, (_, i) => {
    const columns = i + 1;
    return { minWidth: columns === 1 ? 0 : columns * minColumnWidth + (columns - 1) * gap, columns };
  });
}

/** The map in effect, sorted by `minWidth`: explicit, else `stackBelow`, else generated. */
export function resolveBreakpoints(options: ColumnOptions): TileBreakpoint[] {
  const explicit = options.breakpoints?.length ? options.breakpoints : null;
  const map: readonly TileBreakpoint[] =
    explicit ??
    (options.stackBelow != null
      ? [
          { minWidth: 0, columns: 1 },
          { minWidth: options.stackBelow, columns: maxColumnCount(options) },
        ]
      : generateBreakpoints(options));
  return [...map]
    .map((b) => ({ minWidth: Math.max(0, b.minWidth), columns: Math.max(1, Math.floor(b.columns)) }))
    .sort((a, b) => a.minWidth - b.minWidth);
}

/**
 * `min(breakpointColumns(width), fit(width))` (D2): a breakpoint may wrap earlier than
 * `minColumnWidth` would, never later. Below the smallest `minWidth` the board has 1 column.
 */
export function resolveColumnCount(width: number, options: ColumnOptions): number {
  const entry = resolveBreakpoints(options).filter((b) => b.minWidth <= width).pop();
  return Math.min(entry?.columns ?? 1, fitColumns(width, options.minColumnWidth, options.gap));
}

/** The stored counts, ascending. */
export function storedCounts(layouts: TileLayouts | null | undefined): number[] {
  return Object.keys(layouts ?? {})
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1)
    .sort((a, b) => a - b);
}
