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
  announceSorted: (column, direction) =>
    direction === 'none' ? `Sorting removed from ${column}` : `Sorted by ${column}, ${direction}`,
  announcePage: (page, totalPages) => `Page ${page} of ${totalPages}`,
  announceSelection: (count) => (count === 1 ? '1 row selected' : `${count} rows selected`),
  announceLoaded: (rows) => (rows === 1 ? 'Loaded 1 row' : `Loaded ${rows} rows`),
};
