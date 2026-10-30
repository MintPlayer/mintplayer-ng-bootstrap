import type { JsonValue } from '@mintplayer/ui-core/transfer-state';

/**
 * Types for the filter panels and the filter state (#448).
 *
 * The component owns the *state* and the *panel*, never the *filtering*. With
 * `fetch`, the active filters travel in every request and the server applies
 * them; with `data`, the consumer reads the `filters` model and filters its
 * own array. The table never removes a row itself.
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
export interface DistinctsRequest<P extends JsonValue = JsonValue> {
  /** `DatatableColumnDef.name` of the column whose panel is open. */
  column: string;
  /** Current search term; `''` when the user has typed nothing. */
  search: string;
  /**
   * The OTHER columns' active filters: the facet the list should be computed
   * over. The column's own filter is left out, so its unselected values still list.
   */
  filters: DatatableFilters;
  /** The table's `fetchParams`, verbatim. */
  params: P | undefined;
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

/**
 * How a column's built-in panel asks the question.
 *
 * `'values'` lists the column's distinct values as checkboxes. `'comparison'`
 * offers an operator and a single operand — the right shape for a quantity,
 * where ticking forty individual years is a poor way to say "after 1990".
 * `'custom'` renders the table's `filter` slot instead of a built-in panel, for
 * that column only; the slot gets the column and a `FilterContext` (the
 * distinct values load as in `'values'` mode).
 *
 * The consumer picks this per column and the component never infers it: a
 * numeric column is often an enum (a year, in a five-row table) and a string
 * column is often ordinal, so any guess would be wrong about half the time.
 */
export type FilterMode = 'values' | 'comparison' | 'custom';

/** The comparison a `'comparison'` panel applies. */
export type FilterOperator = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte';

/**
 * The `type` of the operand input in a `'comparison'` panel.
 *
 * Quantities only, and deliberately no `'text'`. A comparison against a string
 * is either exact-match — which `'values'` already does better, with a list —
 * or a lexicographic `>`, which is almost never what someone means by
 * "filter this column". **A free-text filter is a nest-your-own case**: supply a
 * `filterRenderer` (Angular: `*bsDatatableFilterPanel`) and drive it from the
 * same `FilterContext` the built-in panels use. There is no `contains` operator
 * for the same reason.
 */
export type FilterInputType = 'number' | 'date' | 'datetime';

/**
 * One column's active filter, as the `filters` model and every request carry it
 * (#448 D1). Labels are not part of it: a value is identified by `value` alone,
 * so a relabelled value is the same filter and the same request.
 *
 * - **Values** (`'values'` and `'custom'` mode): a row matches when its cell
 *   value equals one of `values` (strict equality, `NaN` equal to itself), or,
 *   with `inverse`, equals none of them. A missing or null cell is the value
 *   `null`. `operator` and `operand` are absent.
 * - **Comparison** (`'comparison'` mode): a row matches when
 *   `cell <operator> operand`; `values` is empty and `inverse` false. The
 *   operand is a `number` for `filterInputType: 'number'`, a calendar date
 *   `yyyy-mm-dd` for `'date'` (no time, no timezone) and a UTC instant
 *   `yyyy-mm-ddTHH:mm:ss.sssZ` for `'datetime'` (#448 D10): the same moment for
 *   every user, compared as an instant.
 */
export interface DatatableFilter {
  values: JsonValue[];
  inverse: boolean;
  operator?: FilterOperator;
  operand?: string | number;
}

/**
 * The active filters by `DatatableColumnDef.name`. Only active ones: a column
 * without a filter has no key, never an empty entry, so equal filters are equal
 * requests.
 */
export type DatatableFilters = Readonly<Record<string, DatatableFilter>>;

/** A column's current filter selection, as its panel shows it (values carry their labels). */
export interface FilterSelection {
  values: DistinctValue[];
  /** `true` = exclude the selected values instead of including them. */
  inverse: boolean;
  /** Comparison-mode operator. Ignored in `'values'` mode. */
  operator?: FilterOperator;
  /**
   * Comparison-mode operand, in the `DatatableFilter` encoding. `null` means
   * the user has not entered one, and no filter is active.
   */
  operand?: string | number | null;
}

/**
 * The `filter` slot's `ctx`: a snapshot of the open panel plus the commands the
 * built-in panels use, so a consumer's own panel drives the same machinery — the
 * value list, the search re-query and the change event stay the component's.
 * The slot re-renders with a fresh snapshot on every change.
 */
export interface FilterContext {
  /** The current list, or `null` while nothing has loaded (or nothing can). */
  readonly values: DistinctValues | null;
  /** `true` while a source request for this column is in flight. */
  readonly loading: boolean;
  readonly selection: FilterSelection;
  /** The search box's term. */
  readonly term: string;
  /** Set the search term. Debounced; re-queries the source only when needed. */
  search(term: string): void;
  /** Replace the selection; the `filters` model and, with `fetch`, the rows follow. */
  apply(values: DistinctValue[], inverse: boolean): void;
  /**
   * Set a comparison from the operand's raw text, as the column's input reports
   * it (`datetime-local` text for `'datetime'`); empty or unparseable text clears it.
   */
  compare(operator: FilterOperator, operand: string): void;
  /** Clear the column's filter. */
  clear(): void;
  /** Close the panel. */
  close(): void;
}
