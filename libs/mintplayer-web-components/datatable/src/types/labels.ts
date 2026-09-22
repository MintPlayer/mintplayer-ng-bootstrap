/**
 * User-visible strings rendered by `<mp-datatable>`. Consumers override via the
 * `labels` property; merge semantics are partial — any key the consumer omits
 * falls back to the English default.
 *
 * Patterned after `FileManagerMessages` / `QueryBuilderMessages`. Interpolated
 * strings are **formatter functions**, never prefix/suffix pairs: word order
 * differs across languages, so a translated middle cannot be expressed any
 * other way.
 */
export interface DatatableLabels {
  /** Column header over the tree expand/collapse chevron column. */
  treeChevronColumn: string;
  /** The header checkbox when everything is selected. */
  deselectAll: string;
  /** The header checkbox when not everything is selected. */
  selectAll: string;
  expandRow: string;
  collapseRow: string;
  loading: string;
  rowsPerPage: string;
  resizeColumn: (column: string) => string;
  selectRow: (rowNumber: number) => string;
  /** Accessible name of a column's filter trigger in the filter row. */
  filterColumn: (column: string) => string;
  /**
   * Accessible name of a filter trigger whose column is filtered. `summary` is
   * the column's `filterSummary` when it set one — a formatter, not a suffix,
   * because a translation may need it first.
   */
  filterColumnActive: (column: string, summary?: string) => string;
  /** The filter panel's Clear button. */
  filterClear: (column: string) => string;
  /** The filter panel's search box. */
  filterSearch: string;
  /** The filter panel's include/exclude toggle. */
  filterInvert: string;
  /** Accessible name of the filter panel's checkbox list. */
  filterGroup: (column: string) => string;
  /** Shown when the source truncated the value list. */
  filterHasMore: string;
  /** Shown when no value list could be produced for this column. */
  filterNoValues: string;
  /**
   * Renders one distinct value as a checkbox label.
   *
   * The default implementation reads `filterNone` / `filterEmpty` /
   * `filterTrue` / `filterFalse` off `this`, so it is invoked as a METHOD on
   * the merged label set and a consumer translating only those four keys gets
   * them. A consumer who replaces `filterValue` outright owns all four cases.
   */
  filterValue: (this: DatatableLabels, value: unknown) => string;
  /** `filterValue`'s rendering of `null` / `undefined`. */
  filterNone: string;
  /** `filterValue`'s rendering of the empty string. */
  filterEmpty: string;
  /** `filterValue`'s rendering of `true`. */
  filterTrue: string;
  /** `filterValue`'s rendering of `false`. */
  filterFalse: string;
  /** Announced when a column's filter selection changes. */
  announceFilter: (column: string, count: number) => string;
  /** Live-region announcements (Phase E). */
  announceSorted: (column: string, direction: 'ascending' | 'descending' | 'none') => string;
  announcePage: (page: number, totalPages: number) => string;
  announceSelection: (count: number) => string;
  announceLoaded: (rows: number) => string;
}

export const DEFAULT_DATATABLE_LABELS: DatatableLabels = {
  treeChevronColumn: 'Expand or collapse',
  deselectAll: 'Deselect all',
  selectAll: 'Select all',
  expandRow: 'Expand row',
  collapseRow: 'Collapse row',
  loading: 'Loading',
  rowsPerPage: 'Rows per page',
  resizeColumn: (column) => `Resize column ${column}`,
  selectRow: (rowNumber) => `Select row ${rowNumber}`,
  filterColumn: (column) => `Filter ${column}`,
  filterColumnActive: (column, summary) =>
    summary ? `Filter ${column}, filtered by ${summary}` : `Filter ${column}, filtered`,
  filterClear: (column) => `Clear the filter on ${column}`,
  filterSearch: 'Search values',
  filterInvert: 'Exclude the selected values',
  filterGroup: (column) => `Values of ${column}`,
  filterHasMore: 'More values exist — refine the search to see them',
  filterNoValues: 'No values available',
  filterValue(value) {
    if (value === null || value === undefined) return this.filterNone;
    if (value === '') return this.filterEmpty;
    if (value === true) return this.filterTrue;
    if (value === false) return this.filterFalse;
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  },
  filterNone: '(none)',
  filterEmpty: '(empty)',
  filterTrue: 'Yes',
  filterFalse: 'No',
  announceFilter: (column, count) =>
    count === 0
      ? `Filter cleared on ${column}`
      : count === 1
        ? `1 value selected in ${column}`
        : `${count} values selected in ${column}`,
  announceSorted: (column, direction) =>
    direction === 'none' ? `Sorting removed from ${column}` : `Sorted by ${column}, ${direction}`,
  announcePage: (page, totalPages) => `Page ${page} of ${totalPages}`,
  announceSelection: (count) => (count === 1 ? '1 row selected' : `${count} rows selected`),
  announceLoaded: (rows) => (rows === 1 ? 'Loaded 1 row' : `Loaded ${rows} rows`),
};
