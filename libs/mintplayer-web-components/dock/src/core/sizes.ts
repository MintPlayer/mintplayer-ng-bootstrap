import type { DockSplitNode } from '../types/dock-layout';

/**
 * Split weights. A `DockSplitNode.sizes` array is authored as free-form flex
 * weights — a consumer may write `[1, 2]`, `[30, 70]`, or nothing at all — and
 * everything downstream (rendering, resizing, insertion, flattening) assumes a
 * normalized array of fractions that sums to 1 and has exactly one entry per
 * child. These functions are the single place that assumption is established.
 */

/**
 * Fractions summing to 1, one per child.
 *
 * Every way the input can be unusable resolves to an equal split rather than an
 * error: a missing array, a stale one whose length no longer matches the
 * children, all-zero or all-negative weights, `NaN` from a bad parse. That is
 * deliberate — a layout is user data that arrives from `JSON.parse` of an
 * attribute, and a split that throws would take the whole dock down over a
 * cosmetic detail.
 */
export function normalizeSizesArray(sizes: number[] | undefined, count: number): number[] {
  if (count <= 0) {
    return [];
  }

  if (!Array.isArray(sizes) || sizes.length !== count) {
    return Array.from({ length: count }, () => 1 / count);
  }

  const normalized = sizes.map((value) => (Number.isFinite(value) ? Math.max(value, 0) : 0));
  const total = normalized.reduce((acc, value) => acc + value, 0);
  if (total <= 0) {
    return Array.from({ length: count }, () => 1 / count);
  }

  return normalized.map((value) => value / total);
}

/** Normalize a split's own weights in place. */
export function normalizeSplitNode(split: DockSplitNode): void {
  split.sizes = normalizeSizesArray(split.sizes, split.children.length);
}

/**
 * Weights after inserting a new child at `index`, where `totalChildren` already
 * counts the newcomer.
 *
 * The newcomer takes an equal share (`1 / totalChildren`) and the existing
 * children keep their *relative* proportions inside what is left — so inserting
 * into a 70/30 split gives 47/23 alongside the new 33, not 33/33/33. Anything
 * else would silently re-balance a layout the user had arranged.
 */
export function insertWeight(
  sizes: number[] | undefined,
  index: number,
  totalChildren: number,
): number[] {
  const existingCount = totalChildren - 1;
  const normalized = normalizeSizesArray(sizes, existingCount);
  const newWeight = 1 / totalChildren;
  const remaining = 1 - newWeight;
  const result: number[] = [];
  for (let i = 0; i < totalChildren; i += 1) {
    if (i === index) {
      result.push(newWeight);
    } else {
      const sourceIndex = i < index ? i : i - 1;
      result.push(normalized[sourceIndex] * remaining);
    }
  }
  return result;
}
