import { normalizeSizesArray } from './sizes';

/**
 * Double-clicking an intersection handle toggles between "equalize the panes
 * adjacent to every divider that crosses here" and "put back what was there
 * before". This module owns that decision; the element owns the layout tree and
 * the DOM.
 *
 * The split matters because the decision is the part worth testing and the part
 * that was previously unreachable: it lived inside a method whose only other
 * job was writing measured pixel sizes into `<mp-splitter>`, which made the
 * whole thing look like geometry. It is not — the toggle reads and writes
 * normalized weights and never consults a rect.
 *
 * `planIntersectionResize` returns writes **in call order rather than one per
 * path**. Two pairs crossing the same split legitimately compound, and the
 * element re-pushes to the splitter after each write; collapsing them would
 * change how often `setPanelSizes` is called.
 */

/** One divider crossing: a horizontal split and a vertical split, each by path and divider index. */
export interface IntersectionPair {
  h: { pathStr: string; index: number };
  v: { pathStr: string; index: number };
}

/**
 * What the caller knows about a split node, without exposing the node itself.
 * `sizes` is undefined for a split that has never been given explicit weights —
 * such a split is still equalized, but there is nothing about it worth
 * remembering, since restoring an implicit even split is imperceptible.
 */
export interface SplitSizes {
  sizes: number[] | undefined;
  childCount: number;
}

export interface IntersectionResizePlan {
  /** Ordered: apply each in turn, pushing to the splitter after each, as the element did inline. */
  writes: Array<{ pathStr: string; sizes: number[] }>;
  /** Sizes to remember so the next double-click can restore them. Empty when restoring. */
  remember: Array<{ pathStr: string; sizes: number[] }>;
  /** True when this double-click consumed the stored sizes and they should be dropped. */
  clearStored: boolean;
}

/**
 * Recover the crossing pairs a handle describes.
 *
 * `data-pairs` is the real channel; `data-key` is the single-crossing fallback
 * written by handles that predate it, encoded as `<hPath>:<hIndex>|<vPath>:<vIndex>`.
 * Paths themselves contain `:` separators, so the index is split off at the LAST
 * colon, not the first.
 *
 * Malformed input yields an empty array rather than throwing — a handle with a
 * corrupt dataset should do nothing, not break the element.
 */
export function parseIntersectionPairs(
  pairsRaw: string | undefined,
  keyRaw: string | undefined,
): IntersectionPair[] {
  let parsed: IntersectionPair[] = [];
  if (pairsRaw) {
    try {
      const candidate: unknown = JSON.parse(pairsRaw);
      if (Array.isArray(candidate)) parsed = candidate as IntersectionPair[];
    } catch {
      parsed = [];
    }
  }
  if (parsed.length > 0) return parsed;

  const parts = (keyRaw ?? '').split('|');
  if (parts.length !== 2) return [];
  const [hPart, vPart] = parts;
  const hi = hPart.lastIndexOf(':');
  const vi = vPart.lastIndexOf(':');
  if (hi <= 0 || vi <= 0) return [];

  const hIdx = Number.parseInt(hPart.slice(hi + 1), 10);
  const vIdx = Number.parseInt(vPart.slice(vi + 1), 10);
  return [
    {
      h: { pathStr: hPart.slice(0, hi), index: hIdx },
      v: { pathStr: vPart.slice(0, vi), index: vIdx },
    },
  ];
}

/**
 * Give the two panes either side of `index` an equal share of the space they
 * currently occupy between them, then renormalize the whole row so the weights
 * still sum to 1. Returns the input untouched when the pair has no space to
 * share — halving zero is not an improvement.
 */
export function equalizeAtDivider(sizes: number[], index: number): number[] {
  const next = [...sizes];
  const total = (next[index] ?? 0) + (next[index + 1] ?? 0);
  if (total <= 0) return next;
  next[index] = total / 2;
  next[index + 1] = total / 2;
  const sum = next.reduce((a, s) => a + s, 0);
  return sum > 0 ? next.map((s) => s / sum) : next;
}

/**
 * Decide what a double-click on this intersection should do.
 *
 * Restore wins whenever *any* split touched by these pairs has stored sizes —
 * one remembered split is enough to make the gesture a restore, and a restore
 * puts back every stored split, not only the ones under this handle. That is
 * deliberate: the stored map is a single undo step for the whole layout.
 *
 * `lookup` returns null for a path that is not a split node, which is how a
 * stale handle left over from a layout change is ignored.
 */
export function planIntersectionResize(
  pairs: readonly IntersectionPair[],
  stored: ReadonlyMap<string, number[]>,
  lookup: (pathStr: string) => SplitSizes | null,
): IntersectionResizePlan {
  const plan: IntersectionResizePlan = { writes: [], remember: [], clearStored: false };
  if (pairs.length === 0) return plan;

  const touchedSplits = new Set<string>();
  pairs.forEach((p) => {
    touchedSplits.add(p.h.pathStr);
    touchedSplits.add(p.v.pathStr);
  });

  const hasStored = [...touchedSplits].some((k) => stored.has(k));

  if (hasStored) {
    stored.forEach((sizes, pathStr) => {
      const split = lookup(pathStr);
      if (!split) return;
      plan.writes.push({ pathStr, sizes: normalizeSizesArray(sizes, split.childCount) });
    });
    plan.clearStored = true;
    return plan;
  }

  // Writes accumulate: a later pair sharing a split must see the earlier one's
  // result, exactly as the sequential in-element mutation did.
  const working = new Map<string, number[]>();
  const currentSizes = (pathStr: string): SplitSizes | null => {
    const split = lookup(pathStr);
    if (!split) return null;
    const pending = working.get(pathStr);
    return { childCount: split.childCount, sizes: pending ?? split.sizes };
  };

  const remembered = new Set<string>();
  pairs.forEach((p) => {
    [p.h.pathStr, p.v.pathStr].forEach((pathStr) => {
      if (remembered.has(pathStr)) return;
      remembered.add(pathStr);
      const split = lookup(pathStr);
      // Only a split that already carries explicit sizes is worth remembering —
      // restoring an implicit even split is a no-op the user cannot perceive.
      if (split && Array.isArray(split.sizes)) {
        plan.remember.push({ pathStr, sizes: [...split.sizes] });
      }
    });

    [p.h, p.v].forEach(({ pathStr, index }) => {
      const split = currentSizes(pathStr);
      if (!split) return;
      const normalized = normalizeSizesArray(split.sizes ?? [], split.childCount);
      const next = equalizeAtDivider(normalized, index);
      working.set(pathStr, next);
      plan.writes.push({ pathStr, sizes: next });
    });
  });

  return plan;
}
