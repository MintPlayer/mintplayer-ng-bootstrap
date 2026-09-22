/**
 * Types for the distinct-value filter panel.
 *
 * The component owns the *panel*, never the *filtering*: it collects a
 * selection and emits it. Which rows that selection removes, and whether the
 * removal happens client-side or on a server, belongs to the consumer.
 */

/**
 * One selectable entry in the filter panel's checkbox list.
 *
 * `value` is the raw cell value and is what a consumer matches on; `label` is
 * what the user reads. Identity across re-queries is `value` under SameValueZero
 * (so `NaN` matches itself), never `label` — two rows can render the same text.
 */
export interface DistinctValue {
  value: unknown;
  label: string;
}

/**
 * The value list backing one column's panel, split into the two buckets the
 * panel renders differently.
 *
 * `matching` are values present in the data as currently filtered. `remaining`
 * are values that were present when the column's filter was first applied but
 * are not any more — they stay listed (dimmed) so a user can widen a selection
 * without first clearing it. `hasMore` reports that the source truncated the
 * list, which is what drives a re-query as the user types.
 */
export interface DistinctValues {
  matching: DistinctValue[];
  remaining: DistinctValue[];
  hasMore: boolean;
}

/** One request for a column's distinct values. */
export interface DistinctsRequest {
  /** `DatatableColumnDef.name` of the column whose panel is open. */
  column: string;
  /** Current search term; `''` when the user has typed nothing. */
  search: string;
  /** Aborted when the panel closes or a newer request supersedes this one. */
  signal: AbortSignal;
}

/**
 * Consumer-supplied source of distinct values.
 *
 * Resolving `null` means "I have nothing for this column" and the component
 * falls back to computing the list locally from the rows it holds — which it
 * can only do when it holds all of them (no `fetch`, not externally paged, no
 * tree children). A source that returns `null` for a column it cannot answer is
 * therefore the correct way to mix server-backed and local columns in one table.
 */
export type DatatableDistincts = (request: DistinctsRequest) => Promise<DistinctValues | null>;

/** A column's current filter selection. */
export interface FilterSelection {
  values: DistinctValue[];
  /** `true` = exclude the selected values instead of including them. */
  inverse: boolean;
}

/**
 * Handed to `FilterRenderer` so a consumer's own panel can drive the same
 * machinery the default panel uses — the value list, the search re-query and
 * the change event are the component's, whatever renders them.
 *
 * `values()` and `loading()` are plain getters, not signals: the WC core is
 * framework-agnostic. Re-render on `onChange`.
 */
export interface FilterContext {
  /** The current list, or `null` while nothing has loaded (or nothing can). */
  values(): DistinctValues | null;
  /** `true` while a source request for this column is in flight. */
  loading(): boolean;
  /** Set the search term. Debounced; re-queries the source only when needed. */
  search(term: string): void;
  /** Replace the selection and emit the change event. */
  apply(values: DistinctValue[], inverse: boolean): void;
  /** Clear the selection, reset `inverse`, and emit the change event. */
  clear(): void;
  /** Subscribe to value-list and selection changes. Returns an unsubscribe. */
  onChange(callback: () => void): () => void;
}

/** Detail of the `mp-datatable-filter-change` event. */
export interface FilterChangeDetail {
  /** `DatatableColumnDef.name` of the column whose selection changed. */
  column: string;
  /** Empty when the user cleared the filter. */
  selected: DistinctValue[];
  inverse: boolean;
}
