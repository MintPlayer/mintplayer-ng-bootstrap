import type { SortColumn } from '../sort';

/**
 * Selector for the row's stable identity in tree mode. Used as the expansion
 * key and as the parentId reference returned from `mp-datatable-fetch-request`.
 * Can be a property name on the row object OR a function that derives the id.
 */
export type TreeIdKey<T = unknown> = keyof T | string | ((row: T) => unknown);

/**
 * Selection cascading mode for tree-mode datatables.
 *  - `flat`: leaf-only selection; checking a parent doesn't propagate.
 *  - `cascading`: checking a parent selects parent + all currently-loaded
 *    descendants; the parent shows an indeterminate state when some-but-not-all
 *    of its loaded descendants are selected.
 */
export type TreeSelectionStrategy = 'flat' | 'cascading';

/**
 * Detail of `mp-datatable-fetch-request` — emitted by the WC when it needs
 * data for a parent (tree mode, lazy children). The wrapper bridges this to
 * the consumer's `[fetch]` callback and calls `setFetchResponse()` with the
 * result. `parentId === null` means roots.
 */
export interface TreeFetchRequestDetail {
  parentId: unknown | null;
  page: number;
  perPage: number;
  sortColumns: SortColumn[];
}

/** Response shape consumed by `setFetchResponse()`. */
export interface TreeFetchResponse<T = unknown> {
  data: T[];
  totalRecords: number;
  page: number;
  perPage: number;
}

export interface TreeRowExpandDetail<T = unknown> {
  row: T;
  depth: number;
  parentId: unknown | null;
}

export interface TreeExpandedIdsChangeDetail {
  expandedIds: Set<unknown>;
}
