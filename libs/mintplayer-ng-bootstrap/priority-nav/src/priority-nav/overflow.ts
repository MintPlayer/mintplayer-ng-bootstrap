/**
 * The priority-nav overflow math, as pure functions over numbers so it can be tested without
 * layout. The component feeds them the measured widths.
 */

/**
 * Orders items in overflow order: the first item returned is the first to overflow.
 *
 * A LOWER priority number means MORE important (priority 1 stays visible longest). Items
 * without a priority are least important and overflow before any prioritized item. Ties are
 * broken by declaration order: the last-declared overflows first when overflowing from the
 * end, the first-declared when overflowing from the start.
 */
export function computeOverflowOrder<T extends { priority: number | null }>(items: readonly T[], fromEnd: boolean): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const pa = a.item.priority;
      const pb = b.item.priority;
      if (pa === null && pb !== null) return -1;
      if (pa !== null && pb === null) return 1;
      if (pa !== null && pb !== null && pa !== pb) return pb - pa;
      return fromEnd ? b.index - a.index : a.index - b.index;
    })
    .map(({ item }) => item);
}

/**
 * How far a width may exceed the strip and still count as fitting. The item widths come from a
 * separate measure strip and the strip width from the live one, and each is rounded on its own
 * (float32 layout values, Firefox's 1/60px app units), so a row of items laid out at exactly its
 * own width can measure a hair wider than itself. Half a pixel is above every such rounding error
 * and below one device pixel at a DPR of 2. Issue #428.
 */
export const SUBPIXEL_TOLERANCE = 0.5;

export interface OverflowLayout {
  /** Width of the visible strip. 0 means not measured yet. */
  stripWidth: number;
  /** Width of the More toggle. */
  moreWidth: number;
  /** The strip's column gap. */
  gap: number;
  /** Measured width per item id. */
  widths: ReadonlyMap<number, number>;
  /** Item ids in overflow order (see computeOverflowOrder). */
  order: readonly number[];
}

/**
 * The ids of the items that do not fit. When every item fits there is no More toggle, so N
 * items take N-1 gaps. Once one overflows the toggle appears: with K items kicked out, the
 * strip holds N-K items plus the toggle, so N-K gaps. Items are kicked in overflow order until
 * the rest and the toggle fit.
 */
export function computeOverflowIds({ stripWidth, moreWidth, gap, widths, order }: OverflowLayout): Set<number> {
  if (stripWidth === 0 || widths.size === 0) return new Set();

  const sumWidths = [...widths.values()].reduce((a, b) => a + b, 0);
  if (sumWidths + gap * Math.max(0, widths.size - 1) <= stripWidth + SUBPIXEL_TOLERANCE) return new Set();

  const result = order.reduce(
    (acc, id) => {
      if (acc.done || acc.visibleSum + moreWidth + gap * acc.visibleCount <= stripWidth + SUBPIXEL_TOLERANCE) {
        return { ...acc, done: true };
      }
      return {
        visibleSum: acc.visibleSum - (widths.get(id) ?? 0),
        visibleCount: acc.visibleCount - 1,
        ids: [...acc.ids, id],
        done: false,
      };
    },
    { visibleSum: sumWidths, visibleCount: widths.size, ids: [] as number[], done: false },
  );
  return new Set(result.ids);
}
