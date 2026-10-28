import { describe, expect, it } from 'vitest';
import { DEFAULT_DATATABLE_LABELS as L } from './labels';

/**
 * The default English strings that carry logic: singular/plural and the
 * display of non-string filter values. A regression here is a wrong
 * announcement, invisible to sighted testing.
 */
describe('DEFAULT_DATATABLE_LABELS', () => {
  it('filterValue names the special values and stringifies the rest', () => {
    expect(L.filterValue(null)).toBe('(none)');
    expect(L.filterValue(undefined)).toBe('(none)');
    expect(L.filterValue('')).toBe('(empty)');
    expect(L.filterValue(true)).toBe('Yes');
    expect(L.filterValue(false)).toBe('No');
    const d = new Date(2024, 0, 2);
    expect(L.filterValue(d)).toBe(d.toLocaleDateString());
    expect(L.filterValue(42)).toBe('42');
  });

  it('announceFilter distinguishes cleared, one and many', () => {
    expect(L.announceFilter('Country', 0)).toBe('Filter cleared on Country');
    expect(L.announceFilter('Country', 1)).toBe('1 value selected in Country');
    expect(L.announceFilter('Country', 3)).toBe('3 values selected in Country');
  });

  it('announceComparisonFilter treats an empty operand as a cleared filter', () => {
    expect(L.announceComparisonFilter('Age', 'greater than', '')).toBe('Filter cleared on Age');
    expect(L.announceComparisonFilter('Age', 'greater than', '30')).toBe('Age greater than 30');
  });

  it('row counts are pluralised', () => {
    expect(L.announceSelection(1)).toBe('1 row selected');
    expect(L.announceSelection(2)).toBe('2 rows selected');
    expect(L.announceLoaded(1)).toBe('Loaded 1 row');
    expect(L.announceLoaded(0)).toBe('Loaded 0 rows');
  });

  it('announceSorted reports removal separately from a direction', () => {
    expect(L.announceSorted('Name', 'none')).toBe('Sorting removed from Name');
    expect(L.announceSorted('Name', 'descending')).toBe('Sorted by Name, descending');
  });
});
