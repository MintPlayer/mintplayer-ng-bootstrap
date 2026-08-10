import { describe, expect, it } from 'vitest';
import type { HierarchyNode } from './types';
import { buildIndex, levelOf, partitionLayout, pathTo, squarifyLayout } from './hierarchy-layout';

const tree: HierarchyNode = {
  id: 'root', name: 'repo',
  children: [
    {
      id: 'src', name: 'src', value: 999, // ignored: has children
      children: [
        { id: 'a', name: 'a.ts', value: 600, colorValue: 80 },
        { id: 'b', name: 'b.ts', value: 300, colorValue: 40 },
        { id: 'c', name: 'c.ts', value: 100, colorValue: 0 },
      ],
    },
    { id: 'libs', name: 'libs', value: 500, hasChildren: true }, // lazy: own value counts
    { id: 'tools', name: 'tools', value: 500 },
  ],
};

describe('buildIndex', () => {
  it('rolls up leaf sums; an internal value counts only when childless', () => {
    const index = buildIndex(tree);
    expect(index.values.get('src')).toBe(1000);   // 600+300+100, NOT 999
    expect(index.values.get('libs')).toBe(500);   // lazy node keeps its own value
    expect(index.values.get('root')).toBe(2000);
  });

  it('rolls up a value-weighted color metric for branches without their own', () => {
    const index = buildIndex(tree);
    // src: (600*80 + 300*40 + 100*0) / 1000 = 60
    expect(index.colorValues.get('src')).toBeCloseTo(60, 9);
    // Explicit colorValue wins; nodes without any colored descendants stay undefined.
    expect(index.colorValues.get('a')).toBe(80);
    expect(index.colorValues.get('tools')).toBeUndefined();
    // root: only src carries a metric -> weighted over colored children only.
    expect(index.colorValues.get('root')).toBeCloseTo(60, 9);
  });

  it('tracks parents and paths', () => {
    const index = buildIndex(tree);
    expect(pathTo(index, index.byId.get('a')!).map((n) => n.id)).toEqual(['root', 'src', 'a']);
    expect(levelOf(index, index.byId.get('a')!)).toBe(3);
    expect(levelOf(index, index.root)).toBe(1);
  });
});

describe('partitionLayout', () => {
  it('splits spans by rollup, sorted descending, with set metadata', () => {
    const index = buildIndex(tree);
    const nodes = partitionLayout(index, undefined, { maxDepth: 1 });
    expect(nodes.map((n) => n.node.id)).toEqual(['src', 'libs', 'tools']);
    const src = nodes[0];
    expect(src.x1 - src.x0).toBeCloseTo(0.5, 9); // 1000 of 2000
    expect(src.setsize).toBe(3);
    expect(src.posinset).toBe(1);
    expect(src.level).toBe(2);
    expect(src.hasChildren).toBe(true);
    // Lazy node reports children it has not loaded.
    expect(nodes[1].hasChildren).toBe(true);
    expect(nodes[2].hasChildren).toBe(false);
    // Spans tile [0, 1] without gaps.
    expect(nodes[0].x0).toBe(0);
    expect(nodes[2].x1).toBeCloseTo(1, 9);
    expect(nodes[1].x0).toBeCloseTo(nodes[0].x1, 9);
  });

  it('renders maxDepth rings and re-roots onto the focus subtree', () => {
    const index = buildIndex(tree);
    const all = partitionLayout(index, undefined, { maxDepth: 2 });
    expect(all.map((n) => n.node.id)).toContain('a');

    const focused = partitionLayout(index, 'src', { maxDepth: 2 });
    expect(focused.map((n) => n.node.id)).toEqual(['a', 'b', 'c']);
    // The focus subtree now spans the full sweep.
    expect(focused[0].x0).toBe(0);
    expect(focused[0].x1).toBeCloseTo(0.6, 9);
    expect(focused[2].x1).toBeCloseTo(1, 9);
    // aria-level stays ABSOLUTE while depth is relative to the focus.
    expect(focused[0].level).toBe(3);
    expect(focused[0].depth).toBe(1);
  });

  it('culls below minFraction including the subtree, and splits zero-total sets equally', () => {
    const index = buildIndex(tree);
    const culled = partitionLayout(index, undefined, { maxDepth: 2, minFraction: 0.3 });
    expect(culled.map((n) => n.node.id)).toEqual(['src', 'a']); // libs/tools 0.25 wide -> culled; b,c small
    const zeros = buildIndex({
      id: 'r', name: 'r',
      children: [{ id: 'x', name: 'x', value: 0 }, { id: 'y', name: 'y', value: 0 }],
    });
    const spans = partitionLayout(zeros, undefined, {});
    expect(spans.map((n) => n.x1 - n.x0)).toEqual([0.5, 0.5]);
  });

  it('falls back to the root when the focus id is unknown', () => {
    const index = buildIndex(tree);
    expect(partitionLayout(index, 'gone', { maxDepth: 1 }).map((n) => n.node.id))
      .toEqual(['src', 'libs', 'tools']);
  });
});

describe('squarifyLayout', () => {
  const flat = buildIndex({
    id: 'r', name: 'r',
    children: [6, 6, 4, 3, 2, 2, 1].map((v, i) => ({ id: `n${i}`, name: `n${i}`, value: v })),
  });

  it('produces rects with areas proportional to rollups, inside the unit square', () => {
    const rects = squarifyLayout(flat, undefined, { maxDepth: 1 });
    expect(rects).toHaveLength(7);
    const areas = rects.map((r) => (r.x1 - r.x0) * (r.y1 - r.y0));
    expect(areas.reduce((s, a) => s + a, 0)).toBeCloseTo(1, 6);
    expect(areas[0]).toBeCloseTo(6 / 24, 6);
    rects.map((r) => {
      expect(r.x0).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y0).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x1).toBeLessThanOrEqual(1 + 1e-9);
      expect(r.y1).toBeLessThanOrEqual(1 + 1e-9);
      return r;
    });
  });

  it('keeps aspect ratios civilized (the point of squarify) and rects disjoint', () => {
    const rects = squarifyLayout(flat, undefined, { maxDepth: 1 });
    const worst = Math.max(...rects.map((r) => {
      const w = r.x1 - r.x0, h = r.y1 - r.y0;
      return Math.max(w / h, h / w);
    }));
    // Bruls' paper reports 2.5 for this data in a 6x4 rect; in a unit SQUARE the
    // final leftover cell fills the remainder exactly and lands at 4.17 (hand-verified).
    expect(worst).toBeLessThan(4.5);
    const overlap = rects.flatMap((a, i) => rects.slice(i + 1).map((b) =>
      Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
      Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))));
    expect(Math.max(...overlap)).toBeLessThan(1e-9);
  });

  it('nests children inside the parent rect up to maxDepth', () => {
    const index = buildIndex(tree);
    const rects = squarifyLayout(index, undefined, { maxDepth: 2 });
    const src = rects.find((r) => r.node.id === 'src')!;
    const a = rects.find((r) => r.node.id === 'a')!;
    expect(a.x0).toBeGreaterThanOrEqual(src.x0 - 1e-9);
    expect(a.y0).toBeGreaterThanOrEqual(src.y0 - 1e-9);
    expect(a.x1).toBeLessThanOrEqual(src.x1 + 1e-9);
    expect(a.y1).toBeLessThanOrEqual(src.y1 + 1e-9);
    expect(a.depth).toBe(2);
    expect(a.level).toBe(3);
  });

  it('culls below minArea including the subtree', () => {
    const rects = squarifyLayout(flat, undefined, { maxDepth: 1, minArea: 0.1 });
    expect(rects.map((r) => r.node.id)).toEqual(['n0', 'n1', 'n2', 'n3']); // 2/24 and 1/24 culled
  });

  it('insets children below a header strip when childPadding/childHeaderSpace are set', () => {
    const index = buildIndex(tree);
    const rects = squarifyLayout(index, undefined, { maxDepth: 2, childPadding: 0.01, childHeaderSpace: 0.04 });
    const src = rects.find((r) => r.node.id === 'src')!;
    const kids = rects.filter((r) => r.depth === 2 && ['a', 'b', 'c'].includes(r.node.id));
    kids.map((k) => {
      expect(k.y0).toBeGreaterThanOrEqual(src.y0 + 0.05 - 1e-9); // padding + header
      expect(k.x0).toBeGreaterThanOrEqual(src.x0 + 0.01 - 1e-9);
      expect(k.x1).toBeLessThanOrEqual(src.x1 - 0.01 + 1e-9);
      expect(k.y1).toBeLessThanOrEqual(src.y1 - 0.01 + 1e-9);
      return k;
    });
    // A parent too small for the inset simply renders no children.
    const cramped = squarifyLayout(index, undefined, { maxDepth: 2, childPadding: 0.4, childHeaderSpace: 0.4 });
    expect(cramped.filter((r) => r.depth === 2)).toHaveLength(0);
  });
});
