import { computeOverflowIds, computeOverflowOrder } from './overflow';

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
});
