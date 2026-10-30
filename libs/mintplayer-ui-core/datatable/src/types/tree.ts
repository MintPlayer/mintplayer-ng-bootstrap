import type { JsonValue } from '@mintplayer/ui-core/transfer-state';
import type { SortColumn } from '../sort';
import type { DatatableFilters } from './filter';

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
export interface DatatableFetchRequest<P extends JsonValue = JsonValue> {
  parentId: unknown | null;
  page: number;
  perPage: number;
  sortColumns: SortColumn[];
  /**
   * The active column filters, applied by the server (#448): every root page,
   * window and child request of one query carries the same set, so they stay
   * consistent with each other. See `DatatableFilter` for the semantics.
   */
  filters: DatatableFilters;
  /** The table's `fetchParams`, verbatim: the consumer's own query context (a search term, a parent). */
  params: P | undefined;
  /**
   * Aborts when the table invalidates its pages (sort, page size, filters,
   * params, a new `fetch`, `reload()`), so a superseded request stops instead
   * of running to completion and being ignored. Pass it to `fetch`; the same
   * shape as every other provider request in the libraries (#436 D4).
   */
  signal: AbortSignal;
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
export type DatatableFetch<T = unknown, P extends JsonValue = JsonValue> = (req: DatatableFetchRequest<P>) => Promise<DatatableFetchResponse<T>>;

export interface TreeRowExpandDetail<T = unknown> {
  row: T;
  depth: number;
  parentId: unknown | null;
}

export interface TreeExpandedIdsChangeDetail {
  expandedIds: Set<unknown>;
}
