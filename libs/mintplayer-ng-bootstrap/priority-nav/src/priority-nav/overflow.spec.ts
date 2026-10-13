import { computeOverflowIds, computeOverflowOrder, SUBPIXEL_TOLERANCE } from './overflow';

const item = (id: number, priority: number | null) => ({ id, priority });

describe('computeOverflowOrder', () => {
  it('overflows unprioritized items first, then the highest priority number', () => {
    const items = [item(1, 1), item(2, null), item(3, 3), item(4, 2)];
    expect(computeOverflowOrder(items, true).map((i) => i.id)).toEqual([2, 3, 4, 1]);
  });

  it('breaks ties by declaration order: last first from the end, first first from the start', () => {
    const items = [item(1, null), item(2, null), item(3, 5), item(4, 5)];
    expect(computeOverflowOrder(items, true).map((i) => i.id)).toEqual([2, 1, 4, 3]);
    expect(computeOverflowOrder(items, false).map((i) => i.id)).toEqual([1, 2, 3, 4]);
  });

  it('does not reorder the input', () => {
    const items = [item(1, 1), item(2, null)];
    computeOverflowOrder(items, true);
    expect(items.map((i) => i.id)).toEqual([1, 2]);
  });
});

describe('computeOverflowIds', () => {
  const widths = new Map([[1, 100], [2, 100], [3, 100]]);
  const layout = { moreWidth: 50, gap: 10, widths, order: [3, 2, 1] };

  it('overflows nothing before the strip or the items are measured', () => {
    expect(computeOverflowIds({ ...layout, stripWidth: 0 })).toEqual(new Set());
    expect(computeOverflowIds({ ...layout, stripWidth: 500, widths: new Map() })).toEqual(new Set());
  });

  it('overflows nothing when every item fits with N-1 gaps and no toggle', () => {
    // 300 + 2 gaps = 320
    expect(computeOverflowIds({ ...layout, stripWidth: 320 })).toEqual(new Set());
  });

  it('once anything overflows, reserves the toggle and one gap per remaining item', () => {
    // 319 < 320 → overflow. Kicking 3 leaves 200 + 50 + 2 gaps = 270 ≤ 319.
    expect(computeOverflowIds({ ...layout, stripWidth: 319 })).toEqual(new Set([3]));
  });

  it('kicks items in overflow order until the rest and the toggle fit', () => {
    // one left: 100 + 50 + 10 = 160
    expect(computeOverflowIds({ ...layout, stripWidth: 160 })).toEqual(new Set([3, 2]));
    expect(computeOverflowIds({ ...layout, stripWidth: 159 })).toEqual(new Set([3, 2, 1]));
  });

  it('treats an unmeasured id in the order as zero wide', () => {
    expect(computeOverflowIds({ ...layout, order: [9, 3, 2, 1], stripWidth: 250 })).toEqual(new Set([9, 3, 2]));
  });

  it('counts a strip a sub-pixel narrower than the items as fitting', () => {
    expect(computeOverflowIds({ ...layout, stripWidth: 320 - SUBPIXEL_TOLERANCE })).toEqual(new Set());
    expect(computeOverflowIds({ ...layout, stripWidth: 319.4 })).toEqual(new Set([3]));
  });
});

/**
 * Issue #428: a host that shrink-wraps its content makes the strip width a function of the previous
 * decision. All items inline lay out at their own summed width, rounded by the engine; with items
 * overflowed the strip holds the visible items plus the toggle. The decision must be a fixed point of
 * that loop, or the nav flips state every frame.
 */
describe('computeOverflowIds in a shrink-wrapped host', () => {
  /** Firefox lays out in 1/60px app units. */
  const quantize60 = (px: number) => Math.floor(px * 60) / 60;

  interface Case { widths: number[]; moreWidth: number; gap: number; fitStripWidth?: number }

  function stripWidthFor(c: Case, overflowing: ReadonlySet<number>) {
    const visible = c.widths.filter((_, i) => !overflowing.has(i));
    const visibleSum = visible.reduce((a, b) => a + b, 0);
    if (overflowing.size === 0) {
      return c.fitStripWidth ?? quantize60(visibleSum + c.gap * Math.max(0, visible.length - 1));
    }
    return visibleSum + c.moreWidth + c.gap * visible.length;
  }

  /**
   * Feeds each decision's strip width back in until two decisions in a row agree. Returns the
   * settled decision and how many steps that took (Infinity if it never settles).
   */
  function settle(c: Case) {
    const widths = new Map(c.widths.map((w, i) => [i, w]));
    const order = c.widths.map((_, i) => c.widths.length - 1 - i);
    const decide = (stripWidth: number) =>
      computeOverflowIds({ stripWidth, moreWidth: c.moreWidth, gap: c.gap, widths, order });
    const key = (ids: ReadonlySet<number>) => [...ids].sort().join(',');

    let decision = decide(stripWidthFor(c, new Set()));
    for (let steps = 1; steps <= 10; steps++) {
      const next = decide(stripWidthFor(c, decision));
      if (key(next) === key(decision)) return { steps, overflowing: [...next] };
      decision = next;
    }
    return { steps: Infinity, overflowing: [...decision] };
  }

  // The host is unconstrained here, so the only correct answer is "everything fits".
  const settled = { steps: 1, overflowing: [] };

  it('keeps every item inline with the widths measured in the issue', () => {
    expect(settle({ widths: [63.733, 59.3, 75.733], moreWidth: 76.017, gap: 0 })).toEqual(settled);
  });

  it('keeps every item inline when the live strip measures a float32 hair narrower than its items', () => {
    expect(settle({
      widths: [63.69999695, 48.53334045, 67.7333374],
      moreWidth: 76.0167,
      gap: 0,
      fitStripWidth: 179.96665955,
    })).toEqual(settled);
  });

  it('keeps every item inline for any fractional widths', () => {
    // Deterministic LCG so a failure is reproducible.
    let seed = 428;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    const cases = Array.from({ length: 500 }, (): Case => ({
      widths: Array.from({ length: 2 + Math.floor(random() * 5) }, () => 30 + random() * 90),
      moreWidth: 40 + random() * 50,
      gap: random() < 0.5 ? 0 : 8,
    }));
    expect(cases.filter((c) => settle(c).overflowing.length > 0)).toEqual([]);
  });
});
