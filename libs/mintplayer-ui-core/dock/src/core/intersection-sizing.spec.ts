/**
 * The intersection double-click toggle. This logic was previously inlined in
 * `onIntersectionDoubleClick` and filed as permanently uncovered "geometry" —
 * it is neither. It reads and writes normalized weights and never consults a
 * rect, and the cases below assert only on those weights.
 *
 * Branch coverage is the target here, not line coverage: the interesting
 * behaviour is entirely in which branch runs (restore vs equalize, remembered
 * vs not, stale path vs live), so a spec that only drove the happy path would
 * move lines and prove very little.
 */
import { describe, expect, it } from 'vitest';

import {
  equalizeAtDivider,
  parseIntersectionPairs,
  planIntersectionResize,
  type IntersectionPair,
  type SplitSizes,
} from './intersection-sizing';

const pair = (hPath: string, hIdx: number, vPath: string, vIdx: number): IntersectionPair => ({
  h: { pathStr: hPath, index: hIdx },
  v: { pathStr: vPath, index: vIdx },
});

/** A lookup over a plain table; any path not in the table is a stale handle. */
const lookupFrom = (table: Record<string, SplitSizes>) => (pathStr: string) =>
  table[pathStr] ?? null;

// ===========================================================================
// parseIntersectionPairs
// ===========================================================================

describe('parseIntersectionPairs', () => {
  it('reads the data-pairs JSON channel', () => {
    const raw = JSON.stringify([pair('root', 0, 'root:0', 1)]);
    expect(parseIntersectionPairs(raw, undefined)).toEqual([pair('root', 0, 'root:0', 1)]);
  });

  it('carries every pair through, not just the first', () => {
    const raw = JSON.stringify([pair('a', 0, 'b', 0), pair('c', 1, 'd', 2)]);
    expect(parseIntersectionPairs(raw, undefined)).toHaveLength(2);
  });

  it('falls back to data-key when data-pairs is absent', () => {
    expect(parseIntersectionPairs(undefined, 'root:0|root:0:1:2')).toEqual([
      pair('root', 0, 'root:0:1', 2),
    ]);
  });

  it('splits the divider index off the LAST colon, since paths contain colons', () => {
    // 'root:0:1' is the path and 2 is the index — not path 'root' index 0.
    const [only] = parseIntersectionPairs(undefined, 'root:0:1:3|other:7');
    expect(only.h).toEqual({ pathStr: 'root:0:1', index: 3 });
    expect(only.v).toEqual({ pathStr: 'other', index: 7 });
  });

  it('prefers data-pairs when both are present', () => {
    const raw = JSON.stringify([pair('from-pairs', 0, 'from-pairs', 1)]);
    expect(parseIntersectionPairs(raw, 'from-key:0|from-key:1')[0].h.pathStr).toBe('from-pairs');
  });

  it('falls back to data-key when data-pairs parses to an empty array', () => {
    expect(parseIntersectionPairs('[]', 'a:0|b:1')).toEqual([pair('a', 0, 'b', 1)]);
  });

  it('returns [] rather than throwing on malformed JSON', () => {
    // A corrupt dataset should make the handle inert, not break the element.
    expect(parseIntersectionPairs('{not json', undefined)).toEqual([]);
  });

  it('returns [] when data-pairs is valid JSON but not an array', () => {
    expect(parseIntersectionPairs('{"h":1}', undefined)).toEqual([]);
  });

  it.each([
    ['both keys missing', undefined, undefined],
    ['a key with no separator', undefined, 'root:0'],
    ['a key with too many separators', undefined, 'a:0|b:1|c:2'],
    ['a key whose half has no colon', undefined, 'root|other:1'],
    ['a key whose colon is leading, so the path would be empty', undefined, ':0|other:1'],
  ])('returns [] for %s', (_label, pairsRaw, keyRaw) => {
    expect(parseIntersectionPairs(pairsRaw, keyRaw)).toEqual([]);
  });
});

// ===========================================================================
// equalizeAtDivider
// ===========================================================================

describe('equalizeAtDivider', () => {
  it('gives the two adjacent panes an equal share of the space between them', () => {
    expect(equalizeAtDivider([0.8, 0.2], 0)).toEqual([0.5, 0.5]);
  });

  it('leaves panes on the other side of the row alone, but renormalizes', () => {
    const result = equalizeAtDivider([0.6, 0.2, 0.2], 0);
    expect(result[0]).toBeCloseTo(0.4);
    expect(result[1]).toBeCloseTo(0.4);
    expect(result[2]).toBeCloseTo(0.2);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('equalizes an inner pair', () => {
    const result = equalizeAtDivider([0.2, 0.6, 0.2], 1);
    expect(result[1]).toBeCloseTo(0.4);
    expect(result[2]).toBeCloseTo(0.4);
  });

  it('is a no-op when the pair has no space to share', () => {
    // Halving zero is not an improvement, and normalizing would divide by zero.
    expect(equalizeAtDivider([0, 0], 0)).toEqual([0, 0]);
  });

  it('treats a divider past the end as having only the pane before it', () => {
    expect(equalizeAtDivider([1], 0)).toEqual([0.5, 0.5]);
  });

  it('does not mutate its input', () => {
    const input = [0.8, 0.2];
    equalizeAtDivider(input, 0);
    expect(input).toEqual([0.8, 0.2]);
  });
});

// ===========================================================================
// planIntersectionResize
// ===========================================================================

describe('planIntersectionResize', () => {
  it('plans nothing when there are no pairs', () => {
    const plan = planIntersectionResize([], new Map(), lookupFrom({}));
    expect(plan).toEqual({ writes: [], remember: [], clearStored: false });
  });

  describe('with nothing stored — equalize', () => {
    it('equalizes both splits of the crossing and remembers what was there', () => {
      const table = {
        h: { sizes: [0.8, 0.2], childCount: 2 },
        v: { sizes: [0.3, 0.7], childCount: 2 },
      };
      const plan = planIntersectionResize([pair('h', 0, 'v', 0)], new Map(), lookupFrom(table));

      expect(plan.writes).toEqual([
        { pathStr: 'h', sizes: [0.5, 0.5] },
        { pathStr: 'v', sizes: [0.5, 0.5] },
      ]);
      expect(plan.remember).toEqual([
        { pathStr: 'h', sizes: [0.8, 0.2] },
        { pathStr: 'v', sizes: [0.3, 0.7] },
      ]);
      expect(plan.clearStored).toBe(false);
    });

    it('remembers a copy, not the live array', () => {
      const live = [0.8, 0.2];
      const plan = planIntersectionResize(
        [pair('h', 0, 'v', 0)],
        new Map(),
        lookupFrom({ h: { sizes: live, childCount: 2 }, v: { sizes: [0.5, 0.5], childCount: 2 } }),
      );
      live[0] = 999;
      expect(plan.remember[0].sizes).toEqual([0.8, 0.2]);
    });

    it('does not remember a split that has no explicit sizes', () => {
      // Restoring an implicit even split is imperceptible, so there is nothing
      // worth storing — but the split is still equalized.
      const plan = planIntersectionResize(
        [pair('h', 0, 'v', 0)],
        new Map(),
        lookupFrom({
          h: { sizes: undefined, childCount: 2 },
          v: { sizes: [0.3, 0.7], childCount: 2 },
        }),
      );
      expect(plan.remember.map((r) => r.pathStr)).toEqual(['v']);
      expect(plan.writes.map((w) => w.pathStr)).toEqual(['h', 'v']);
    });

    it('remembers each split once even when several pairs share it', () => {
      const table = {
        shared: { sizes: [0.6, 0.2, 0.2], childCount: 3 },
        v1: { sizes: [0.5, 0.5], childCount: 2 },
        v2: { sizes: [0.5, 0.5], childCount: 2 },
      };
      const plan = planIntersectionResize(
        [pair('shared', 0, 'v1', 0), pair('shared', 1, 'v2', 0)],
        new Map(),
        lookupFrom(table),
      );
      expect(plan.remember.filter((r) => r.pathStr === 'shared')).toHaveLength(1);
    });

    it('compounds writes when two pairs touch the same split', () => {
      // The second equalize must see the first one's result. Collapsing the
      // writes per path would silently drop the second adjustment.
      const plan = planIntersectionResize(
        [pair('shared', 0, 'v1', 0), pair('shared', 1, 'v2', 0)],
        new Map(),
        lookupFrom({
          shared: { sizes: [0.6, 0.2, 0.2], childCount: 3 },
          v1: { sizes: [0.5, 0.5], childCount: 2 },
          v2: { sizes: [0.5, 0.5], childCount: 2 },
        }),
      );

      const sharedWrites = plan.writes.filter((w) => w.pathStr === 'shared');
      expect(sharedWrites).toHaveLength(2);
      // First: divider 0 equalizes 0.6/0.2 -> 0.4/0.4/0.2.
      expect(sharedWrites[0].sizes.map((n) => +n.toFixed(4))).toEqual([0.4, 0.4, 0.2]);
      // Second: divider 1 equalizes THAT result's 0.4/0.2 -> 0.4/0.3/0.3.
      expect(sharedWrites[1].sizes.map((n) => +n.toFixed(4))).toEqual([0.4, 0.3, 0.3]);
    });

    it('skips a stale path the layout no longer contains', () => {
      const plan = planIntersectionResize(
        [pair('gone', 0, 'v', 0)],
        new Map(),
        lookupFrom({ v: { sizes: [0.3, 0.7], childCount: 2 } }),
      );
      expect(plan.writes.map((w) => w.pathStr)).toEqual(['v']);
      expect(plan.remember.map((r) => r.pathStr)).toEqual(['v']);
    });

    it('normalizes a sizes array that does not match the child count', () => {
      const plan = planIntersectionResize(
        [pair('h', 0, 'h', 0)],
        new Map(),
        lookupFrom({ h: { sizes: [1], childCount: 3 } }),
      );
      expect(plan.writes[0].sizes).toHaveLength(3);
    });
  });

  describe('with something stored — restore', () => {
    it('restores and clears, ignoring the pairs entirely', () => {
      const stored = new Map([['h', [0.8, 0.2]]]);
      const plan = planIntersectionResize(
        [pair('h', 0, 'v', 0)],
        stored,
        lookupFrom({
          h: { sizes: [0.5, 0.5], childCount: 2 },
          v: { sizes: [0.5, 0.5], childCount: 2 },
        }),
      );

      expect(plan.writes).toEqual([{ pathStr: 'h', sizes: [0.8, 0.2] }]);
      expect(plan.remember).toEqual([]);
      expect(plan.clearStored).toBe(true);
    });

    it('one remembered split under this handle restores ALL stored splits', () => {
      // The stored map is a single undo step for the whole layout, not a
      // per-handle one.
      const stored = new Map([
        ['h', [0.8, 0.2]],
        ['elsewhere', [0.9, 0.1]],
      ]);
      const plan = planIntersectionResize(
        [pair('h', 0, 'v', 0)],
        stored,
        lookupFrom({
          h: { sizes: [0.5, 0.5], childCount: 2 },
          v: { sizes: [0.5, 0.5], childCount: 2 },
          elsewhere: { sizes: [0.5, 0.5], childCount: 2 },
        }),
      );
      expect(plan.writes.map((w) => w.pathStr)).toEqual(['h', 'elsewhere']);
    });

    it('equalizes instead when the stored entries are for other splits', () => {
      const stored = new Map([['unrelated', [0.8, 0.2]]]);
      const plan = planIntersectionResize(
        [pair('h', 0, 'v', 0)],
        stored,
        lookupFrom({
          h: { sizes: [0.8, 0.2], childCount: 2 },
          v: { sizes: [0.8, 0.2], childCount: 2 },
        }),
      );
      expect(plan.clearStored).toBe(false);
      expect(plan.writes).toHaveLength(2);
    });

    it('drops a stored split whose path is gone, but still clears', () => {
      const stored = new Map([
        ['h', [0.8, 0.2]],
        ['gone', [0.9, 0.1]],
      ]);
      const plan = planIntersectionResize(
        [pair('h', 0, 'v', 0)],
        stored,
        lookupFrom({ h: { sizes: [0.5, 0.5], childCount: 2 } }),
      );
      expect(plan.writes.map((w) => w.pathStr)).toEqual(['h']);
      expect(plan.clearStored).toBe(true);
    });

    it('renormalizes a stored array against the split it is being put back into', () => {
      // A pane was closed while the sizes were stored; the restore must fit the
      // split as it is now, not as it was.
      const plan = planIntersectionResize(
        [pair('h', 0, 'v', 0)],
        new Map([['h', [0.5, 0.3, 0.2]]]),
        lookupFrom({ h: { sizes: [0.5, 0.5], childCount: 2 } }),
      );
      expect(plan.writes[0].sizes).toHaveLength(2);
    });
  });

  it('round-trips: equalize then restore returns the original weights', () => {
    const table = {
      h: { sizes: [0.8, 0.2], childCount: 2 },
      v: { sizes: [0.3, 0.7], childCount: 2 },
    };
    const pairs = [pair('h', 0, 'v', 0)];

    const first = planIntersectionResize(pairs, new Map(), lookupFrom(table));
    const stored = new Map(first.remember.map((r) => [r.pathStr, r.sizes]));
    // The element applies the writes to the tree between the two clicks.
    first.writes.forEach(({ pathStr, sizes }) => {
      table[pathStr as keyof typeof table] = { sizes, childCount: 2 };
    });

    const second = planIntersectionResize(pairs, stored, lookupFrom(table));
    expect(second.writes).toEqual([
      { pathStr: 'h', sizes: [0.8, 0.2] },
      { pathStr: 'v', sizes: [0.3, 0.7] },
    ]);
    expect(second.clearStored).toBe(true);
  });
});
