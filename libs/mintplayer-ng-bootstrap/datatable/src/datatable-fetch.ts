import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';

/**
 * Extended pagination request passed to `BsDatatableFetch` callbacks.
 *
 * `parentId` is populated when the datatable is in tree mode (`[tree]="true"`)
 * and the WC needs children for a specific row. `parentId === undefined` (or
 * absent) means the call is for the root level. Consumers can use plain
 * `PaginationRequest`-typed callbacks unchanged — TypeScript's contravariance
 * for function parameters allows the wider input type.
 */
export interface BsDatatableFetchRequest extends PaginationRequest {
  parentId?: unknown;
  /**
   * Aborts when the table invalidates its pages (sort, page size, a new
   * `[fetch]`, `reload()`), so a superseded request stops instead of running to
   * completion and being ignored. Hand it to `fetch`; for an `HttpClient`
   * observable, unsubscribe on `signal.addEventListener('abort', …)`.
   */
  signal: AbortSignal;
}

export type BsDatatableFetch<T> =
  (req: BsDatatableFetchRequest) => Promise<PaginationResponse<T>>;
