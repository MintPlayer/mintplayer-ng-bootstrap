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
 * Request passed to the `fetch` callback. `parentId === null` is a root window
 * (flat rows, or the tree's top level — pages ≥ 2 are windowed lazily); a
 * non-null `parentId` is a tree node's children.
 */
export interface DatatableFetchRequest {
  parentId: unknown | null;
  page: number;
  perPage: number;
  sortColumns: SortColumn[];
}

/**
 * Response returned from the `fetch` callback. Only `data` + `totalRecords` are
 * required — the WC already knows the page/perPage it asked for, and derives
 * the grand total from `totalRecords`, so consumers never set a separate
 * `totalRecords` property.
 */
export interface DatatableFetchResponse<T = unknown> {
  data: T[];
  totalRecords: number;
}

/**
 * High-level fetch callback — the ONLY server-paging API. Set `el.fetch` and
 * the web component owns the whole loop: initial page, on-demand windows, tree
 * children, pagination, and sort/perPage reloads, deriving `totalRecords` from
 * the response. Works standalone (no framework) — `el.fetch = fn` is all a
 * plain web-components consumer needs.
 */
export type DatatableFetch<T = unknown> = (req: DatatableFetchRequest) => Promise<DatatableFetchResponse<T>>;

export interface TreeRowExpandDetail<T = unknown> {
  row: T;
  depth: number;
  parentId: unknown | null;
}

export interface TreeExpandedIdsChangeDetail {
  expandedIds: Set<unknown>;
}
