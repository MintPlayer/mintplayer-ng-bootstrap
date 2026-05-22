import { describe, it, expect } from 'vitest';
import { computeNextSort, type SortColumn } from './compute-next-sort';
describe('computeNextSort', () => {
  const asc = (property: string): SortColumn => ({ property, direction: 'ascending' });
  const desc = (property: string): SortColumn => ({ property, direction: 'descending' });

  it('starts a new ascending sort on a previously unsorted column (no shift)', () => {
    expect(computeNextSort([], 'name', false)).toEqual([asc('name')]);
  });

  it('replaces the single-column sort when clicking a different column (no shift)', () => {
    expect(computeNextSort([asc('age')], 'name', false)).toEqual([asc('name')]);
  });

  it('toggles asc → desc when clicking the same single-column sort (no shift)', () => {
    expect(computeNextSort([asc('name')], 'name', false)).toEqual([desc('name')]);
  });

  it('resets to ascending when clicking the same column twice (asc → desc → asc)', () => {
    expect(computeNextSort([desc('name')], 'name', false)).toEqual([asc('name')]);
  });

  it('clears previous multi-sort when clicking a new column without shift', () => {
    expect(computeNextSort([asc('age'), desc('name')], 'city', false)).toEqual([asc('city')]);
  });

  it('shift-click on a new column appends ascending', () => {
    expect(computeNextSort([asc('age')], 'name', true)).toEqual([asc('age'), asc('name')]);
  });

  it('shift-click on an ascending column toggles to descending', () => {
    expect(computeNextSort([asc('age'), asc('name')], 'name', true)).toEqual([
      asc('age'),
      desc('name'),
    ]);
  });

  it('shift-click on a descending column removes it', () => {
    expect(computeNextSort([asc('age'), desc('name')], 'name', true)).toEqual([asc('age')]);
  });

  it('shift-click on a sole descending column removes it (empty result)', () => {
    expect(computeNextSort([desc('name')], 'name', true)).toEqual([]);
  });
});
