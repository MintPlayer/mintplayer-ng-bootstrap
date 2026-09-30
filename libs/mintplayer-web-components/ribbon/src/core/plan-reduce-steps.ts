import type { RibbonGroupSize, RibbonReduceStep } from '../mp-ribbon-tab.element';

/** Item sizes a group can resolve its items to. */
export type RibbonItemSize = 'large' | 'medium' | 'small';

/** Gap between adjacent groups in the active tab, in px. */
export const RIBBON_GROUP_GAP = 8;

/** One group of the active tab, as measured by the caller. */
export interface ReduceGroup {
  /** The group's current rendered width. */
  width: number;
  /** The group's width when last seen expanded (0 when never seen). */
  naturalWidth: number;
  /** Author priority; lower collapses first, higher expands first. */
  priority: number;
  /** False for `auto-scale="false"`: never collapsed by the reflow. */
  autoScale: boolean;
  /** True while the group is collapsed to its popup trigger. */
  collapsed: boolean;
}

export interface ReduceModel {
  /** Width the active tab offers its groups. */
  available: number;
  gap: number;
  groups: readonly ReduceGroup[];
}

/** The next mutation the priority reflow should make, by group index. */
export type ReduceStep = { action: 'collapse' | 'expand'; index: number };

/** Total width the groups occupy, gaps included. */
export function occupiedWidth(widths: readonly number[], gap: number): number {
  return widths.reduce((sum, width, i) => sum + width + (i > 0 ? gap : 0), 0);
}

/**
 * Among expanded, auto-scaling groups, the one with the lowest priority;
 * ties go to the rightmost (DOM order). -1 when none can collapse.
 */
function collapseCandidate(groups: readonly ReduceGroup[]): number {
  return groups.reduce(
    (chosen, g, i) =>
      g.collapsed || !g.autoScale
        ? chosen
        : chosen === -1 || g.priority <= groups[chosen].priority
          ? i
          : chosen,
    -1
  );
}

/**
 * Among collapsed groups, the one with the highest priority; ties go to the
 * leftmost. -1 when nothing is collapsed.
 */
function expandCandidate(groups: readonly ReduceGroup[]): number {
  return groups.reduce(
    (chosen, g, i) =>
      !g.collapsed ? chosen : chosen === -1 || g.priority > groups[chosen].priority ? i : chosen,
    -1
  );
}

/**
 * Plan the priority reflow's next step from measured widths. Over budget, it
 * collapses the next candidate; under budget, it expands the next collapsed
 * group but only when the group's natural width would still fit. Null means
 * the layout is settled: it fits exactly, nothing can collapse, or the next
 * expansion would overflow.
 *
 * The caller applies the step, re-measures (a collapsed group's width is
 * only known once it has been laid out collapsed) and asks again.
 */
export function planReduceStep(model: ReduceModel): ReduceStep | null {
  const { available, gap, groups } = model;
  const occupied = occupiedWidth(
    groups.map((g) => g.width),
    gap
  );
  if (occupied > available) {
    const index = collapseCandidate(groups);
    return index === -1 ? null : { action: 'collapse', index };
  }
  if (occupied < available) {
    const index = expandCandidate(groups);
    if (index === -1) return null;
    const projected = occupied + (groups[index].naturalWidth - groups[index].width);
    return projected > available ? null : { action: 'expand', index };
  }
  return null;
}

/** Width the Simplified layout keeps free for its overflow chevron, in px. */
export const SIMPLIFIED_CHEVRON_RESERVATION = 40;

/**
 * Simplified layout (FR-39): the index of the first group that no longer fits
 * beside the overflow chevron. That group and every later one move into the
 * chevron's menu. Equals `widths.length` when everything fits.
 */
export function simplifiedOverflowStart(widths: readonly number[], available: number): number {
  const budget = available - SIMPLIFIED_CHEVRON_RESERVATION;
  const index = widths.findIndex(
    (_, i) => occupiedWidth(widths.slice(0, i + 1), RIBBON_GROUP_GAP) > budget
  );
  return index === -1 ? widths.length : index;
}

/**
 * The resolved size of `groupId` after the first `count` steps of an
 * author-declared reduceOrder have been applied, starting from its ideal size
 * (`large` when unset).
 */
export function sizeAtStepIndex(
  steps: readonly RibbonReduceStep[],
  count: number,
  groupId: string,
  idealSizes: Record<string, RibbonGroupSize>
): RibbonGroupSize {
  return steps
    .slice(0, Math.max(0, count))
    .reduce<RibbonGroupSize>(
      (size, [id, target]) => (id === groupId ? target : size),
      idealSizes[groupId] ?? 'large'
    );
}

/**
 * The rendered size of an item given its consumer-declared size and its
 * group's resolved size. Items only ever shrink, never grow past what the
 * consumer declared.
 */
export function deriveItemSize(
  original: RibbonItemSize,
  groupSize: Exclude<RibbonGroupSize, 'popup'>
): RibbonItemSize {
  if (groupSize === 'large') return original;
  if (groupSize === 'small') return 'small';
  return original === 'large' ? 'medium' : original;
}
