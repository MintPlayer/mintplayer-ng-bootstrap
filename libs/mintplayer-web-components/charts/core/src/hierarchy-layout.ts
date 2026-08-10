/**
 * Hierarchy layouts, DOM-free.
 *
 * `buildIndex` rolls a HierarchyNode tree up once per data write (leaf-sum
 * semantics: an internal node's own `value` counts only when it has no
 * children — sizing by anything else inverts salience, see PRD §1.1).
 * `partitionLayout` produces the sunburst/icicle geometry (normalized spans),
 * `squarifyLayout` the treemap rects. Both lay out the subtree of a focus
 * node, which IS the re-root operation: a descendant's span within the focus
 * equals Observable's clamp/remap of a whole-tree partition.
 */
import type { HierarchyNode } from './types';

export interface HierarchyIndex {
  root: HierarchyNode;
  byId: Map<string, HierarchyNode>;
  parents: Map<string, HierarchyNode | null>;
  /** Rolled-up weight per node id. */
  values: Map<string, number>;
  /**
   * Effective color metric per node id: the node's own `colorValue`, or for a
   * branch without one, the value-weighted average of its children's — so a
   * coverage tree colors its folders like codecov does without the consumer
   * precomputing folder metrics.
   */
  colorValues: Map<string, number | undefined>;
}

export function buildIndex(root: HierarchyNode): HierarchyIndex {
  const byId = new Map<string, HierarchyNode>();
  const parents = new Map<string, HierarchyNode | null>();
  const values = new Map<string, number>();
  const colorValues = new Map<string, number | undefined>();

  const roll = (node: HierarchyNode, parent: HierarchyNode | null): number => {
    byId.set(node.id, node);
    parents.set(node.id, parent);
    const value = node.children?.length
      ? node.children.map((child) => roll(child, node)).reduce((sum, v) => sum + v, 0)
      : node.value ?? 0;
    values.set(node.id, value);
    const colored = (node.children ?? []).filter((c) => colorValues.get(c.id) !== undefined);
    const weight = colored.map((c) => values.get(c.id) ?? 0).reduce((s, v) => s + v, 0);
    colorValues.set(
      node.id,
      node.colorValue !== undefined
        ? node.colorValue
        : weight > 0
          ? colored
              .map((c) => (colorValues.get(c.id) ?? 0) * (values.get(c.id) ?? 0))
              .reduce((s, v) => s + v, 0) / weight
          : undefined,
    );
    return value;
  };
  roll(root, null);

  return { root, byId, parents, values, colorValues };
}

/** Ancestors from the data root down to (and including) the node. */
export function pathTo(index: HierarchyIndex, node: HierarchyNode): HierarchyNode[] {
  const chain = (n: HierarchyNode | null | undefined): HierarchyNode[] =>
    n ? [...chain(index.parents.get(n.id)), n] : [];
  return chain(node);
}

/** Absolute depth in the data tree; the root is level 1 (aria-level semantics). */
export function levelOf(index: HierarchyIndex, node: HierarchyNode): number {
  return pathTo(index, node).length;
}

interface LayoutNodeBase {
  node: HierarchyNode;
  /** Depth relative to the focus node; the first rendered ring/column is 1. */
  depth: number;
  /** Absolute aria-level (data root = 1). */
  level: number;
  setsize: number;
  posinset: number;
  hasChildren: boolean;
}

export interface PartitionNode extends LayoutNodeBase {
  /** Normalized span of the full sweep, in [0, 1]. */
  x0: number;
  x1: number;
}

export interface PartitionOptions {
  /** Rings/columns rendered outward from the focus. */
  maxDepth?: number;
  /** Spans narrower than this fraction are culled (with their subtree). */
  minFraction?: number;
}

const hasKids = (node: HierarchyNode): boolean => !!(node.children?.length || node.hasChildren);

function sortedChildren(index: HierarchyIndex, node: HierarchyNode): HierarchyNode[] {
  return [...(node.children ?? [])].sort(
    (a, b) => (index.values.get(b.id) ?? 0) - (index.values.get(a.id) ?? 0),
  );
}

export function resolveFocus(index: HierarchyIndex, focusId: string | undefined): HierarchyNode {
  return (focusId !== undefined && index.byId.get(focusId)) || index.root;
}

export function partitionLayout(
  index: HierarchyIndex,
  focusId: string | undefined,
  options: PartitionOptions = {},
): PartitionNode[] {
  const { maxDepth = 2, minFraction = 0 } = options;
  const focus = resolveFocus(index, focusId);
  const out: PartitionNode[] = [];

  const walk = (parent: HierarchyNode, x0: number, x1: number, depth: number, level: number): void => {
    if (depth > maxDepth) return;
    const kids = sortedChildren(index, parent);
    if (!kids.length) return;
    const total = kids.map((k) => index.values.get(k.id) ?? 0).reduce((s, v) => s + v, 0);
    kids.reduce((start, kid, i) => {
      const fraction = total > 0 ? (index.values.get(kid.id) ?? 0) / total : 1 / kids.length;
      const end = start + (x1 - x0) * fraction;
      if (end - start >= minFraction && end > start) {
        out.push({
          node: kid, x0: start, x1: end, depth,
          level: level + 1, setsize: kids.length, posinset: i + 1,
          hasChildren: hasKids(kid),
        });
        walk(kid, start, end, depth + 1, level + 1);
      }
      return end;
    }, x0);
  };

  walk(focus, 0, 1, 1, levelOf(index, focus));
  return out;
}

export interface RectNode extends LayoutNodeBase {
  /** Normalized rect in the unit square, x rightward, y downward. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface SquarifyOptions {
  maxDepth?: number;
  /** Rects with normalized area below this are culled (with their subtree). */
  minArea?: number;
  /** Normalized inset applied on all sides of a parent rect before laying out its children. */
  childPadding?: number;
  /** Extra normalized inset at the TOP of a parent rect, reserving a label strip. */
  childHeaderSpace?: number;
}

interface Rect { x0: number; y0: number; x1: number; y1: number }

/** Worst aspect ratio of a row of areas laid against a side of length `side`. */
function worstRatio(areas: number[], side: number): number {
  const sum = areas.reduce((s, a) => s + a, 0);
  if (sum === 0 || side === 0) return Infinity;
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  const s2 = sum * sum;
  const w2 = side * side;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

/**
 * Squarified treemap (Bruls, Huizing, van Wijk): greedily grow a row while the
 * worst aspect ratio improves, then fix the row along the shorter side.
 * `areas` must be sorted descending and sum to the area of `rect`.
 */
function squarifyRect(items: { id: string; area: number }[], rect: Rect): Map<string, Rect> {
  const out = new Map<string, Rect>();
  let free = { ...rect };
  let queue = items.filter((i) => i.area > 0);

  const layRow = (row: { id: string; area: number }[]): void => {
    const rowArea = row.reduce((s, i) => s + i.area, 0);
    const w = free.x1 - free.x0;
    const h = free.y1 - free.y0;
    if (rowArea <= 0 || w <= 0 || h <= 0) return;
    if (w >= h) {
      // Row is a vertical strip on the left of the free rect.
      const stripW = rowArea / h;
      row.reduce((y, item) => {
        const itemH = item.area / stripW;
        out.set(item.id, { x0: free.x0, y0: y, x1: free.x0 + stripW, y1: y + itemH });
        return y + itemH;
      }, free.y0);
      free = { ...free, x0: free.x0 + stripW };
    } else {
      // Row is a horizontal strip on the top of the free rect.
      const stripH = rowArea / w;
      row.reduce((x, item) => {
        const itemW = item.area / stripH;
        out.set(item.id, { x0: x, y0: free.y0, x1: x + itemW, y1: free.y0 + stripH });
        return x + itemW;
      }, free.x0);
      free = { ...free, y0: free.y0 + stripH };
    }
  };

  let row: { id: string; area: number }[] = [];
  while (queue.length) {
    const side = Math.min(free.x1 - free.x0, free.y1 - free.y0);
    const candidate = [...row, queue[0]];
    if (!row.length || worstRatio(candidate.map((i) => i.area), side) <= worstRatio(row.map((i) => i.area), side)) {
      row = candidate;
      queue = queue.slice(1);
    } else {
      layRow(row);
      row = [];
    }
  }
  layRow(row);
  return out;
}

export function squarifyLayout(
  index: HierarchyIndex,
  focusId: string | undefined,
  options: SquarifyOptions = {},
): RectNode[] {
  const { maxDepth = 2, minArea = 0, childPadding = 0, childHeaderSpace = 0 } = options;
  const focus = resolveFocus(index, focusId);
  const out: RectNode[] = [];

  const insetOf = (rect: Rect): Rect | null => {
    const inset = {
      x0: rect.x0 + childPadding,
      y0: rect.y0 + childPadding + childHeaderSpace,
      x1: rect.x1 - childPadding,
      y1: rect.y1 - childPadding,
    };
    return inset.x1 - inset.x0 > 0 && inset.y1 - inset.y0 > 0 ? inset : null;
  };

  const walk = (parent: HierarchyNode, outerRect: Rect, depth: number, level: number): void => {
    if (depth > maxDepth) return;
    const rect = depth === 1 ? outerRect : insetOf(outerRect);
    if (!rect) return;
    const kids = sortedChildren(index, parent);
    if (!kids.length) return;
    const rectArea = (rect.x1 - rect.x0) * (rect.y1 - rect.y0);
    const total = kids.map((k) => index.values.get(k.id) ?? 0).reduce((s, v) => s + v, 0);
    const items = kids.map((k) => ({
      id: k.id,
      area: total > 0 ? ((index.values.get(k.id) ?? 0) / total) * rectArea : rectArea / kids.length,
    }));
    const rects = squarifyRect(items, rect);
    kids
      .map((kid, i) => ({ kid, i, r: rects.get(kid.id) }))
      .filter((e): e is { kid: HierarchyNode; i: number; r: Rect } =>
        !!e.r && (e.r.x1 - e.r.x0) * (e.r.y1 - e.r.y0) >= minArea)
      .map((e) => {
        out.push({
          node: e.kid, ...e.r, depth,
          level: level + 1, setsize: kids.length, posinset: e.i + 1,
          hasChildren: hasKids(e.kid),
        });
        walk(e.kid, e.r, depth + 1, level + 1);
        return e;
      });
  };

  walk(focus, { x0: 0, y0: 0, x1: 1, y1: 1 }, 1, levelOf(index, focus));
  return out;
}
