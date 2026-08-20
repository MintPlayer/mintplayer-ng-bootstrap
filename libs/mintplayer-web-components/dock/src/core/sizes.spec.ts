import { describe, expect, it } from 'vitest';

import type { DockSplitNode } from '../types/dock-layout';
import { insertWeight, normalizeSizesArray, normalizeSplitNode } from './sizes';

/**
 * Split weights. A layout arrives from `JSON.parse` of an attribute a consumer
 * wrote, so every one of these functions is handling untrusted data — and the
 * contract is that nothing here throws. A layout that fails to render because
 * a weight was `null` would take the whole dock down over a cosmetic detail.
 */

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('normalizeSizesArray', () => {
  it('converts weights to fractions summing to 1', () => {
    expect(normalizeSizesArray([1, 3], 2)).toEqual([0.25, 0.75]);
  });

  // Percentages, ratios and fractions are all valid input; only the ratios
  // between them matter.
  it.each([
    [[30, 70]],
    [[3, 7]],
    [[0.3, 0.7]],
  ])('reads %j as the same proportion', (input) => {
    expect(normalizeSizesArray(input, 2)).toEqual([0.3, 0.7]);
  });

  it('splits equally when there are no sizes at all', () => {
    expect(normalizeSizesArray(undefined, 4)).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  // A stale array is the common case: a child was added or removed and the
  // sizes were not updated with it. Guessing which entry to drop would be worse
  // than starting even.
  it('splits equally when the array length no longer matches the children', () => {
    expect(normalizeSizesArray([0.5, 0.5], 3)).toEqual([1 / 3, 1 / 3, 1 / 3]);
    expect(normalizeSizesArray([0.2, 0.3, 0.5], 2)).toEqual([0.5, 0.5]);
  });

  it('splits equally when every weight is zero', () => {
    expect(normalizeSizesArray([0, 0], 2)).toEqual([0.5, 0.5]);
  });

  it('floors a negative weight at zero and renormalizes the rest', () => {
    expect(normalizeSizesArray([-5, 1], 2)).toEqual([0, 1]);
  });

  it('treats a non-finite weight as zero', () => {
    expect(normalizeSizesArray([Number.NaN, 1], 2)).toEqual([0, 1]);
    expect(normalizeSizesArray([Number.POSITIVE_INFINITY, 1], 2)).toEqual([0, 1]);
  });

  it('splits equally when every weight is unusable', () => {
    expect(normalizeSizesArray([Number.NaN, -1], 2)).toEqual([0.5, 0.5]);
  });

  it('returns nothing for a split with no children', () => {
    expect(normalizeSizesArray([0.5, 0.5], 0)).toEqual([]);
    expect(normalizeSizesArray(undefined, -1)).toEqual([]);
  });

  it('always sums to 1', () => {
    for (const input of [[1, 2, 3], [0, 5], [10], [0.1, 0.1, 0.1, 0.1]]) {
      expect(sum(normalizeSizesArray(input, input.length))).toBeCloseTo(1, 10);
    }
  });

  it('is idempotent', () => {
    const once = normalizeSizesArray([2, 5, 3], 3);
    expect(normalizeSizesArray(once, 3)).toEqual(once);
  });

  it('does not mutate the caller array', () => {
    const input = [1, 3];
    normalizeSizesArray(input, 2);
    expect(input).toEqual([1, 3]);
  });
});

describe('normalizeSplitNode', () => {
  it('writes normalized weights onto the node', () => {
    const split: DockSplitNode = {
      kind: 'split',
      direction: 'horizontal',
      sizes: [1, 1, 2],
      children: [
        { kind: 'stack', panes: ['a'] },
        { kind: 'stack', panes: ['b'] },
        { kind: 'stack', panes: ['c'] },
      ],
    };

    normalizeSplitNode(split);

    expect(split.sizes).toEqual([0.25, 0.25, 0.5]);
  });

  it('supplies weights for a split that has none', () => {
    const split: DockSplitNode = {
      kind: 'split',
      direction: 'vertical',
      children: [
        { kind: 'stack', panes: ['a'] },
        { kind: 'stack', panes: ['b'] },
      ],
    };

    normalizeSplitNode(split);

    expect(split.sizes).toEqual([0.5, 0.5]);
  });
});

describe('insertWeight', () => {
  it('gives the newcomer an equal share', () => {
    expect(insertWeight([0.5, 0.5], 0, 3)[0]).toBeCloseTo(1 / 3, 10);
  });

  /*
   * The existing children keep their proportions *relative to each other*
   * inside what is left over. Dropping a pane into a 70/30 split leaves 47/23,
   * not 33/33 — anything else silently re-balances a layout the user arranged
   * by hand, which is the kind of change nobody reports as a bug and everybody
   * notices.
   */
  it('preserves the existing ratio among the incumbents', () => {
    const [a, , c] = insertWeight([0.7, 0.3], 1, 3);
    expect(a / c).toBeCloseTo(0.7 / 0.3, 10);
  });

  it('sums to 1 wherever the newcomer lands', () => {
    for (const index of [0, 1, 2, 3]) {
      expect(sum(insertWeight([0.2, 0.3, 0.5], index, 4))).toBeCloseTo(1, 10);
    }
  });

  it('puts the new weight at the requested index', () => {
    const result = insertWeight([0.2, 0.8], 2, 3);
    expect(result[2]).toBeCloseTo(1 / 3, 10);
  });

  it('shifts the incumbents right of the insertion point', () => {
    const result = insertWeight([0.8, 0.2], 0, 3);
    expect(result[1] / result[2]).toBeCloseTo(4, 10);
  });

  it('turns an empty split into a single full-width child', () => {
    expect(insertWeight(undefined, 0, 1)).toEqual([1]);
  });

  it('halves an only child when a second arrives', () => {
    expect(insertWeight([1], 1, 2)).toEqual([0.5, 0.5]);
  });

  it('copes with stale incoming sizes', () => {
    expect(sum(insertWeight([0.5, 0.5], 0, 5))).toBeCloseTo(1, 10);
  });
});
