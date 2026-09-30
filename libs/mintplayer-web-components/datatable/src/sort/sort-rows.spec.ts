import { describe, expect, it } from 'vitest';
import { sortRows } from './sort-rows';

const asc = (property: string) => ({ property, direction: 'ascending' as const });
const desc = (property: string) => ({ property, direction: 'descending' as const });

describe('sortRows', () => {
  it('returns a copy in input order when no columns are given', () => {
    const rows = [{ a: 2 }, { a: 1 }];
    const out = sortRows(rows, []);
    expect(out).toEqual(rows);
    expect(out).not.toBe(rows);
  });

  it('compares numbers numerically, not lexically', () => {
    const out = sortRows([{ n: 10 }, { n: 9 }, { n: 100 }], [asc('n')]);
    expect(out.map((r) => r.n)).toEqual([9, 10, 100]);
  });

  it('compares dates by time', () => {
    const late = new Date(2024, 5, 1);
    const early = new Date(2020, 0, 1);
    expect(sortRows([{ d: late }, { d: early }], [asc('d')]).map((r) => r.d)).toEqual([early, late]);
  });

  it('compares everything else as locale strings', () => {
    expect(sortRows([{ s: 'beta' }, { s: 'Alpha' }], [asc('s')]).map((r) => r.s)).toEqual(['Alpha', 'beta']);
  });

  it('sorts null and missing values last when ascending, first when descending', () => {
    const rows = [{ v: null }, { v: 2 }, {}, { v: 1 }];
    expect(sortRows(rows, [asc('v')]).map((r) => (r as { v?: number | null }).v)).toEqual([1, 2, null, undefined]);
    expect(sortRows(rows, [desc('v')]).map((r) => (r as { v?: number | null }).v).slice(2)).toEqual([2, 1]);
  });

  it('breaks ties with later columns, and keeps input order when every column ties', () => {
    const rows = [
      { g: 'b', n: 1, tag: 'first' },
      { g: 'a', n: 2, tag: 'x' },
      { g: 'b', n: 0, tag: 'y' },
      { g: 'b', n: 1, tag: 'second' },
    ];
    expect(sortRows(rows, [asc('g'), desc('n')]).map((r) => r.tag)).toEqual(['x', 'first', 'second', 'y']);
  });

  it('treats non-object rows as having no value', () => {
    expect(sortRows([3, { k: 1 }, null], [asc('k')])).toEqual([{ k: 1 }, 3, null]);
  });
});
