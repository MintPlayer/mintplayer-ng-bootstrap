import { describe, expect, it } from 'vitest';

import {
  deriveItemSize,
  occupiedWidth,
  planReduceStep,
  RIBBON_GROUP_GAP,
  simplifiedOverflowStart,
  sizeAtStepIndex,
  type ReduceGroup,
} from './plan-reduce-steps';

const group = (overrides: Partial<ReduceGroup> = {}): ReduceGroup => ({
  width: 100,
  naturalWidth: 100,
  priority: 0,
  autoScale: true,
  collapsed: false,
  ...overrides,
});

const plan = (available: number, groups: ReduceGroup[]) =>
  planReduceStep({ available, gap: RIBBON_GROUP_GAP, groups });

describe('occupiedWidth', () => {
  it('sums the widths with one gap between each adjacent pair', () => {
    expect(occupiedWidth([100, 50, 30], 8)).toBe(196);
  });

  it('is the lone width for one group and zero for none', () => {
    expect(occupiedWidth([100], 8)).toBe(100);
    expect(occupiedWidth([], 8)).toBe(0);
  });
});

describe('planReduceStep — over budget', () => {
  it('collapses the lowest-priority group first', () => {
    const step = plan(150, [group({ priority: 2 }), group({ priority: 1 }), group({ priority: 3 })]);
    expect(step).toEqual({ action: 'collapse', index: 1 });
  });

  it('breaks a priority tie toward the rightmost group', () => {
    expect(plan(150, [group(), group(), group()])).toEqual({ action: 'collapse', index: 2 });
  });

  it('never collapses an auto-scale="false" group or one already collapsed', () => {
    const step = plan(150, [
      group({ priority: 5 }),
      group({ autoScale: false }),
      group({ collapsed: true, width: 40 }),
    ]);
    expect(step).toEqual({ action: 'collapse', index: 0 });
  });

  it('settles (null) when nothing is left to collapse', () => {
    expect(plan(50, [group({ autoScale: false }), group({ collapsed: true })])).toBeNull();
  });
});

describe('planReduceStep — under budget', () => {
  it('expands the highest-priority collapsed group when its natural width fits', () => {
    const groups = [
      group({ collapsed: true, width: 40, naturalWidth: 100, priority: 1 }),
      group({ collapsed: true, width: 40, naturalWidth: 100, priority: 4 }),
    ];
    // occupied = 40 + 8 + 40 = 88; expanding #1 projects 148.
    expect(plan(150, groups)).toEqual({ action: 'expand', index: 1 });
  });

  it('breaks a priority tie toward the leftmost collapsed group', () => {
    const groups = [
      group(),
      group({ collapsed: true, width: 40, naturalWidth: 60 }),
      group({ collapsed: true, width: 40, naturalWidth: 60 }),
    ];
    expect(plan(500, groups)).toEqual({ action: 'expand', index: 1 });
  });

  it('holds (null) when the expansion would overflow', () => {
    const groups = [group(), group({ collapsed: true, width: 40, naturalWidth: 100 })];
    // occupied = 148; expanding projects 208 > 200.
    expect(plan(200, groups)).toBeNull();
  });

  it('expands onto exactly the available width', () => {
    const groups = [group(), group({ collapsed: true, width: 40, naturalWidth: 92 })];
    // occupied = 148; expanding projects 200.
    expect(plan(200, groups)).toEqual({ action: 'expand', index: 1 });
  });

  it('settles (null) when nothing is collapsed', () => {
    expect(plan(500, [group(), group()])).toBeNull();
  });
});

describe('planReduceStep — exact fit and sequences', () => {
  it('settles (null) when the groups fill the width exactly', () => {
    expect(plan(208, [group(), group()])).toBeNull();
  });

  it('driven step by step, collapses in priority order until the content fits', () => {
    const popupWidth = 40;
    const groups = [group({ priority: 3 }), group({ priority: 1 }), group({ priority: 2 })];
    const order: number[] = [];
    // Apply each planned collapse the way the element does, re-measuring the
    // collapsed group at its popup width.
    const drive = (): void => {
      const step = plan(200, groups);
      if (step?.action !== 'collapse') return;
      groups[step.index] = { ...groups[step.index], collapsed: true, width: popupWidth };
      order.push(step.index);
      drive();
    };
    drive();
    // 316 -> collapse #1 (256) -> collapse #2 (196 fits).
    expect(order).toEqual([1, 2]);
  });
});

describe('simplifiedOverflowStart', () => {
  it('keeps every group when they all fit beside the 40px chevron', () => {
    // 100 + 8 + 100 = 208 <= 250 - 40
    expect(simplifiedOverflowStart([100, 100], 250)).toBe(2);
  });

  it('moves the first group past the budget, and all after it, into the menu', () => {
    // cumulative 100, 208, 316 against a 260 budget
    expect(simplifiedOverflowStart([100, 100, 100, 10], 300)).toBe(2);
  });

  it('counts the chevron reservation: a group that fits the width but not the budget overflows', () => {
    expect(simplifiedOverflowStart([100], 120)).toBe(0);
  });

  it('fits exactly on the budget', () => {
    expect(simplifiedOverflowStart([100, 92], 240)).toBe(2);
  });

  it('returns 0 when there are no groups', () => {
    expect(simplifiedOverflowStart([], 100)).toBe(0);
  });
});

describe('sizeAtStepIndex', () => {
  const steps = [
    ['a', 'medium'],
    ['b', 'small'],
    ['a', 'popup'],
  ] as const;

  it('starts from the ideal size, or large when none is declared', () => {
    expect(sizeAtStepIndex(steps, 0, 'a', { a: 'medium' })).toBe('medium');
    expect(sizeAtStepIndex(steps, 0, 'a', {})).toBe('large');
  });

  it('takes the last step for the group within the first `count` steps', () => {
    expect(sizeAtStepIndex(steps, 1, 'a', {})).toBe('medium');
    expect(sizeAtStepIndex(steps, 2, 'a', {})).toBe('medium');
    expect(sizeAtStepIndex(steps, 3, 'a', {})).toBe('popup');
  });

  it('ignores steps for other groups', () => {
    expect(sizeAtStepIndex(steps, 3, 'b', {})).toBe('small');
    expect(sizeAtStepIndex(steps, 3, 'c', {})).toBe('large');
  });
});

describe('deriveItemSize', () => {
  it.each([
    ['large', 'large', 'large'],
    ['medium', 'large', 'medium'],
    ['large', 'medium', 'medium'],
    ['medium', 'medium', 'medium'],
    ['small', 'medium', 'small'],
    ['large', 'small', 'small'],
  ] as const)('an item declared %s in a %s group renders %s', (original, groupSize, expected) => {
    expect(deriveItemSize(original, groupSize)).toBe(expected);
  });
});
