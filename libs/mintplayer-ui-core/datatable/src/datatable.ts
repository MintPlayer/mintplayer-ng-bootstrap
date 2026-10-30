import type { CoreBag } from '@mintplayer/ui-core/component';
import { hydratedAttr } from '@mintplayer/ui-core/store';
import { connectPagination, type PaginationEntry } from '@mintplayer/ui-core/pagination';
import { virtualWindow } from '@mintplayer/ui-core/virtual-window';
import { MIN_COLUMN_WIDTH } from './column-resize';
import { computeNextSort, sortRows, type SortColumn } from './sort';
import type { DatatableColumnDef, RowKey, RowRenderContext } from './types/column-def';
import type { JsonValue } from '@mintplayer/ui-core/transfer-state';
import type {
  DatatableFilter,
  DatatableFilters,
  DistinctValue,
  DistinctValues,
  FilterContext,
  FilterInputType,
  FilterMode,
  FilterOperator,
  FilterSelection,
} from './types/filter';
import { DEFAULT_DATATABLE_LABELS, DEFAULT_FILTER_OPERATORS, FILTER_OPERATOR_SYMBOLS, type DatatableLabels } from './types/labels';
import type { TreeIdKey, TreeSelectionStrategy } from './types/tree';

/**
 * The datatable, framework-neutral (PRD #437): a `<table>` whose header,
 * cells and rows are front-native slots. Everything here is pure: the flat
 * list of visible rows (sorted, paged, windowed, tree-flattened, with
 * placeholders for rows not loaded yet) and the attribute bags of every node.
 *
 * Columns are data. A cell shows `column.format(row)` (default
 * `String(row[name])`) unless the `cell` slot renders it; the `row` slot
 * replaces all of a row's data cells at once.
 */

export const DATATABLE_SCOPE = 'datatable';

export type DatatableBag = CoreBag;

export type DatatableSelectionMode = 'none' | 'single' | 'multiple' | 'checkbox';

export interface RowEventDetail<T = unknown> {
  row: T;
  rowIndex: number;
  rowKey: string;
  originalEvent: Event;
}

export interface SelectionChangeEventDetail<T = unknown> {
  selectedIds: string[];
  /** Index-aligned with `selectedIds`: the loaded row, else the row remembered at selection time. */
  selectedRows: (T | undefined)[];
}

export interface DatatableReloadOptions {
  /** Also return to page 1. */
  resetPage?: boolean;
}

/** What a `hrefFor` link would show: the table's paging and sort after following it. */
export interface DatatableHrefState {
  page: number;
  perPage: number;
  sortColumns: SortColumn[];
}

export type DatatableHrefFor = (state: DatatableHrefState) => string;

export const parseSelectionMode = (v: string | null | undefined): DatatableSelectionMode =>
  v === 'single' || v === 'multiple' || v === 'checkbox' ? v : 'none';

/** One entry of the visible list: a loaded row, or a placeholder for one that is not loaded yet. */
export interface FlatRow {
  readonly row: unknown;
  readonly key: string;
  readonly depth: number;
  readonly parentId: unknown | null;
  /** The root page a windowed placeholder belongs to. */
  readonly page?: number;
  readonly isExpanded: boolean;
  readonly isPlaceholder: boolean;
  readonly childCount: number;
}

/** A row keyed by its `id`, else by its position (a positional key cannot survive a re-fetch or a sort). */
export const defaultRowKey: RowKey = (row, index) => {
  const r = row as { id?: unknown } | null;
  return r && r.id != null ? String(r.id) : `row-${index}`;
};

export function rowId(row: unknown, idKey: TreeIdKey | null | undefined): unknown {
  if (!idKey || row == null || typeof row !== 'object') return null;
  return typeof idKey === 'function' ? (idKey as (r: unknown) => unknown)(row) : (row as Record<string, unknown>)[idKey as string];
}

export function rowChildCount(row: unknown, childCountKey: string | null | undefined): number {
  if (!childCountKey || row == null || typeof row !== 'object') return 0;
  const v = (row as Record<string, unknown>)[childCountKey];
  return typeof v === 'number' && v > 0 ? v : 0;
}

/** The default cell text. */
export function cellText(row: unknown, column: DatatableColumnDef, rowIndex: number): string {
  if (column.format) return column.format(row, rowIndex);
  const v = row != null && typeof row === 'object' ? (row as Record<string, unknown>)[column.name] : undefined;
  return v == null ? '' : String(v);
}

export interface DatatableModelInput {
  /** Root rows: `data`, or page 1 of `fetch`. */
  readonly rows: readonly unknown[];
  /** The server's row count with `fetch`, else null. */
  readonly totalRecords: number | null;
  /** Root pages ≥ 2 of a windowed fetch. */
  readonly pageCache: ReadonlyMap<number, readonly unknown[]>;
  readonly childCache: ReadonlyMap<unknown, readonly unknown[]>;
  readonly childTotals: ReadonlyMap<unknown, number>;
  readonly tree: boolean;
  readonly virtualScroll: boolean;
  readonly pagination: boolean;
  /** Client-side sorting (off while the server sorts). */
  readonly autoSort: boolean;
  readonly sortColumns: readonly SortColumn[];
  readonly page: number;
  readonly perPage: number;
  readonly rowKey: RowKey;
  readonly idKey: TreeIdKey | null;
  readonly childCountKey: string | null;
  readonly expandedIds: readonly unknown[];
}

export interface DatatableModel {
  readonly list: readonly FlatRow[];
  /** The rows are one server page of more. */
  readonly externallyPaged: boolean;
  /** Virtual scrolling pulls root pages ≥ 2 as their placeholders scroll into view. */
  readonly rootWindowed: boolean;
  /** Added to a list index to give the row's position in the whole table. */
  readonly indexOffset: number;
  readonly totalPages: number;
  /** Data rows in the whole table, for `aria-rowcount`. */
  readonly rowCount: number;
  /** The row each loaded key names, including fetched children of collapsed parents. */
  readonly rowsByKey: ReadonlyMap<string, unknown>;
  /** The key a row object renders under (an index-free `rowKey` call for rows outside the list). */
  keyOf(row: unknown): string;
}

const placeholder = (key: string, depth: number, parentId: unknown | null, page?: number): FlatRow => ({
  row: undefined,
  key,
  depth,
  parentId,
  ...(page === undefined ? {} : { page }),
  isExpanded: false,
  isPlaceholder: true,
  childCount: 0,
});

/** The visible list, keyed: what the table renders before virtual windowing. */
export function datatableModel(o: DatatableModelInput): DatatableModel {
  const perPage = Math.max(1, o.perPage);
  const externallyPaged = o.totalRecords != null && o.totalRecords > o.rows.length;
  const rootWindowed = o.virtualScroll && externallyPaged;
  const sorted = (rows: readonly unknown[]) => (o.autoSort && o.sortColumns.length > 0 ? sortRows(rows as unknown[], [...o.sortColumns]) : rows);
  const expanded = new Set(o.expandedIds);

  // Roots of a windowed fetch: page 1 is `rows`, later pages come from the cache, holes are placeholders.
  const windowedRoots = (keyPrefix: string): (unknown | FlatRow)[] =>
    Array.from({ length: o.totalRecords ?? o.rows.length }, (_, i) => {
      const page = Math.floor(i / perPage) + 1;
      const row = page === 1 ? o.rows[i % perPage] : o.pageCache.get(page)?.[i % perPage];
      return row !== undefined ? row : placeholder(`${keyPrefix}${i}`, 0, null, page);
    });
  const isPlaceholderEntry = (v: unknown): v is FlatRow => !!v && typeof v === 'object' && (v as FlatRow).isPlaceholder === true && 'parentId' in (v as object);

  const node = (row: unknown, depth: number, parentId: unknown | null): FlatRow[] => {
    const id = rowId(row, o.idKey);
    const childCount = rowChildCount(row, o.childCountKey);
    const isExpanded = id != null && expanded.has(id);
    const self: FlatRow = { row, key: '', depth, parentId, isExpanded, isPlaceholder: false, childCount };
    if (!isExpanded || childCount === 0 || id == null) return [self];
    const cached = o.childCache.get(id);
    const loaded = cached?.length ?? 0;
    const missing = cached ? Math.max(0, (o.childTotals.get(id) ?? loaded) - loaded) : childCount;
    return [
      self,
      ...sorted(cached ?? []).flatMap((child) => node(child, depth + 1, id)),
      ...Array.from({ length: missing }, (_, j) => placeholder(`__placeholder-${String(id)}-${loaded + j}`, depth + 1, id)),
    ];
  };

  const pageOffset = !o.tree && o.pagination && !rootWindowed ? (o.page - 1) * perPage : 0;
  const unkeyed: FlatRow[] = o.tree
    ? (rootWindowed ? windowedRoots('__placeholder-root-') : sorted(o.rows)).flatMap((r) => (isPlaceholderEntry(r) ? [r] : node(r, 0, null)))
    : rootWindowed
      ? windowedRoots('__placeholder-flat-').map((r) => (isPlaceholderEntry(r) ? r : { row: r, key: '', depth: 0, parentId: null, isExpanded: false, isPlaceholder: false, childCount: 0 }))
      : (o.pagination && !externallyPaged ? sorted(o.rows).slice(pageOffset, pageOffset + perPage) : sorted(o.rows)).map((row) => ({
          row,
          key: '',
          depth: 0,
          parentId: null,
          isExpanded: false,
          isPlaceholder: false,
          childCount: 0,
        }));
  // Keys use the GLOBAL position: row 0 of page 1 and row 0 of page 2 must differ.
  const keyBase = o.tree || rootWindowed ? 0 : pageOffset;
  const list = unkeyed.map((r, i) => (r.isPlaceholder ? r : { ...r, key: o.rowKey(r.row, keyBase + i) }));

  // With local paging every page is loaded, so rows of the other pages are keyed by their global index too.
  const live: [string, unknown][] =
    !o.tree && o.pagination && !externallyPaged
      ? sorted(o.rows).map((row, i) => [o.rowKey(row, i), row])
      : list.filter((r) => !r.isPlaceholder).map((r) => [r.key, r.row]);
  const byRow = new Map(live.map(([k, r]) => [r, k]));
  const keyOf = (row: unknown) => byRow.get(row) ?? o.rowKey(row, -1);
  const children = [...o.childCache.values()].flat().map((child) => [keyOf(child), child] as [string, unknown]);
  const rowsByKey = new Map([...children, ...live]);

  const denominator = o.totalRecords ?? o.rows.length;
  return {
    list,
    externallyPaged,
    rootWindowed,
    indexOffset: pageOffset,
    totalPages: o.pagination && !o.tree ? Math.max(1, Math.ceil(denominator / perPage)) : 1,
    rowCount: o.tree || rootWindowed ? list.length : denominator,
    rowsByKey,
    keyOf,
  };
}

/** A row and its loaded descendants, as `[key, row]` (a cascade selects them together). */
export function descendantsOf(
  model: DatatableModel,
  row: unknown,
  childCache: ReadonlyMap<unknown, readonly unknown[]>,
  idKey: TreeIdKey | null,
): [string, unknown][] {
  const id = rowId(row, idKey);
  const cached = id != null ? childCache.get(id) : undefined;
  return (cached ?? []).flatMap((child) => [[model.keyOf(child), child] as [string, unknown], ...descendantsOf(model, child, childCache, idKey)]);
}

/** Keys of loaded parents whose loaded subtree is partly selected. */
export function indeterminateKeys(
  model: DatatableModel,
  roots: readonly unknown[],
  childCache: ReadonlyMap<unknown, readonly unknown[]>,
  idKey: TreeIdKey | null,
  selected: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>();
  const visit = (row: unknown): { selected: number; total: number } => {
    const id = rowId(row, idKey);
    const children = id != null ? (childCache.get(id) ?? []) : [];
    const sums = children
      .map((child) => {
        const sub = visit(child);
        return { selected: sub.selected + (selected.has(model.keyOf(child)) ? 1 : 0), total: sub.total + 1 };
      })
      .reduce((a, b) => ({ selected: a.selected + b.selected, total: a.total + b.total }), { selected: 0, total: 0 });
    if (sums.selected > 0 && sums.selected < sums.total) out.add(model.keyOf(row));
    return sums;
  };
  roots.map(visit);
  return out;
}

export interface DatatableHeaderCell {
  readonly key: string;
  readonly column: DatatableColumnDef;
  readonly th: DatatableBag;
  readonly style: Record<string, string>;
  readonly sortable: boolean;
  /** The sort button, or the sort link with `hrefFor`; unused for an unsortable column. */
  readonly sort: DatatableBag;
  readonly sortHref: string | null;
  /** The unsortable header's span. */
  readonly plain: DatatableBag;
  readonly text: DatatableBag;
  readonly label: string;
  readonly sortIndex: DatatableBag | null;
  readonly sortIndexText: string;
  readonly resize: DatatableBag | null;
}

export interface DatatableCell {
  readonly key: string;
  readonly column: DatatableColumnDef;
  readonly td: DatatableBag;
  readonly text: string;
}

export interface DatatableRow {
  readonly key: string;
  readonly tr: DatatableBag;
  readonly chevronCell: DatatableBag | null;
  readonly chevronStyle: Record<string, string>;
  readonly chevron: DatatableBag | null;
  readonly chevronText: string;
  readonly checkCell: DatatableBag | null;
  readonly check: DatatableBag | null;
  readonly checked: boolean;
  readonly indeterminate: boolean;
  /** A placeholder row's single cell. */
  readonly placeholder: DatatableBag | null;
  readonly row: unknown;
  readonly rowIndex: number;
  readonly ctx: RowRenderContext;
  readonly cells: readonly DatatableCell[];
}

export interface DatatableSpacer {
  readonly tr: DatatableBag;
  readonly td: DatatableBag;
  readonly style: Record<string, string>;
}

export interface DatatablePagerEntry {
  readonly key: string;
  readonly item: DatatableBag;
  readonly link: DatatableBag;
  readonly text: string;
  readonly gap: boolean;
  /** Render an `<a>` (with `hrefFor`). */
  readonly anchor: boolean;
  /** The link's target; empty unless `anchor`. */
  readonly href: string;
}

export interface DatatablePager {
  readonly key: string;
  readonly nav: DatatableBag;
  readonly list: DatatableBag;
  readonly entries: readonly DatatablePagerEntry[];
}

export interface DatatableView {
  readonly root: DatatableBag;
  readonly live: DatatableBag;
  readonly announcement: string;
  readonly shell: DatatableBag;
  readonly scroll: DatatableBag;
  readonly table: DatatableBag;
  readonly tableStyle: Record<string, string>;
  readonly caption: string | null;
  readonly captionBag: DatatableBag;
  readonly thead: DatatableBag;
  readonly headerRow: DatatableBag;
  readonly chevronHeader: DatatableBag | null;
  readonly checkHeader: DatatableBag | null;
  readonly deselectAll: DatatableBag;
  /** Shows the deselect-all box, half-checked. */
  readonly anySelected: boolean;
  readonly headers: readonly DatatableHeaderCell[];
  readonly tbody: DatatableBag;
  readonly stateRow: DatatableBag;
  /** The loading or empty message's cell, or null while rows show. */
  readonly stateCell: DatatableBag | null;
  readonly stateText: string;
  readonly spacerTop: DatatableSpacer | null;
  readonly spacerBottom: DatatableSpacer | null;
  readonly rows: readonly DatatableRow[];
  readonly footer: DatatableBag | null;
  readonly pagers: readonly DatatablePager[];
  /** The column resize options: a native popover, the tap and Enter alternative to dragging. */
  readonly resizePanel: DatatableBag;
  readonly resizeSteps: DatatableBag;
  readonly narrower: DatatableBag;
  readonly wider: DatatableBag;
  readonly stepGlyph: DatatableBag;
  readonly widthOutput: DatatableBag;
  readonly widthText: string;
  readonly fit: DatatableBag;
  readonly reset: DatatableBag;
  /** The filter row, or null when no column is filterable. */
  readonly filterRow: DatatableBag | null;
  readonly filterChevronCell: DatatableBag | null;
  readonly filterCheckCell: DatatableBag | null;
  readonly filterCells: readonly DatatableFilterCell[];
  readonly labels: DatatableLabels;
}

export interface DatatableFilterOption {
  readonly key: string;
  readonly label: DatatableBag;
  readonly input: DatatableBag;
  readonly checked: boolean;
  readonly text: string;
}

export interface DatatableFilterOperatorOption {
  readonly key: string;
  readonly option: DatatableBag;
  readonly text: string;
}

/** The open panel's content: the `filter` slot's arguments, and the built-in panel it falls back to. */
export interface DatatableFilterPanel {
  readonly column: DatatableColumnDef;
  readonly ctx: FilterContext;
  readonly body: DatatableBag;
  readonly clear: DatatableBag;
  readonly clearText: string;
  /** Custom mode: the `filter` slot renders the panel; `list` and `comparison` are null. */
  readonly custom: boolean;
  /** Values mode: search, invert and the checkbox list. Null in the other modes. */
  readonly list: {
    readonly search: DatatableBag;
    readonly term: string;
    readonly invert: DatatableBag;
    readonly invertText: string;
    readonly group: DatatableBag;
    readonly loading: DatatableBag | null;
    readonly loadingText: string;
    readonly options: readonly DatatableFilterOption[];
    readonly noValues: DatatableBag | null;
    readonly noValuesText: string;
    readonly hasMore: DatatableBag | null;
    readonly hasMoreText: string;
  } | null;
  /** Comparison mode: an operator and one operand. Null in values mode. */
  readonly comparison: {
    readonly wrap: DatatableBag;
    readonly operator: DatatableBag;
    readonly operatorValue: string;
    readonly operators: readonly DatatableFilterOperatorOption[];
    readonly operand: DatatableBag;
    readonly operandText: string;
    /** `'datetime'` only: the applied instant in the user's locale, the target of the operand's `aria-describedby`. */
    readonly applied: DatatableBag | null;
    readonly appliedText: string;
  } | null;
}

export interface DatatableFilterCell {
  readonly key: string;
  readonly th: DatatableBag;
  /** The trigger, its panel and the panel's open content; null for a column that is not filterable. */
  readonly trigger: DatatableBag | null;
  readonly icon: DatatableBag;
  readonly path: DatatableBag;
  readonly summary: DatatableBag | null;
  readonly summaryText: string;
  readonly panel: DatatableBag | null;
  readonly open: DatatableFilterPanel | null;
}

/** What a filter panel's controls call; the core implements it per instance. */
export interface DatatableFilterCommands {
  search(column: string, term: string): void;
  apply(column: string, values: DistinctValue[], inverse: boolean): void;
  compare(column: string, operator: FilterOperator, operand: string): void;
  clear(column: string): void;
  close(): void;
}

/** The filter state `connectDatatable` renders. */
export interface DatatableFilterView {
  /** The column whose panel is open. */
  readonly column: string | null;
  readonly selections: Readonly<Record<string, FilterSelection>>;
  readonly operandTexts: Readonly<Record<string, string>>;
  /** The open column's list, already bucketed and narrowed by `term`. */
  readonly values: DistinctValues | null;
  readonly loading: boolean;
  readonly term: string;
  readonly commands: DatatableFilterCommands;
}

/** `===` except that `NaN` equals itself: the identity `Map` and `Set` keys use. */
export const sameValue = (a: unknown, b: unknown): boolean => a === b || (a !== a && b !== b);

export const includesValue = (values: readonly DistinctValue[], value: unknown): boolean =>
  values.some((v) => sameValue(v.value, value));

export const EMPTY_SELECTION: FilterSelection = { values: [], inverse: false };

/** A column's selection as its panel shows it; a column without one has the empty selection. */
export const filterSelectionOf = (column: DatatableColumnDef | undefined, selections: Readonly<Record<string, FilterSelection>>): FilterSelection =>
  (column && selections[column.name]) || EMPTY_SELECTION;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/**
 * An empty input, and a `'number'` input holding something unparseable, both
 * mean "no filter" rather than a comparison against `NaN`. A `'date'` stays
 * the calendar date the input reports: parsing it to a Date would pick the
 * runtime's timezone. A `'datetime'` is the input's local wall-clock time,
 * converted to the UTC instant it names (#448 D10). A wall-clock time inside a
 * daylight-saving gap resolves forward and one inside an overlap to the earlier
 * instant, as `Date` does; the panel shows the result back.
 */
export function parseOperand(raw: string, type: FilterInputType | undefined): string | number | null {
  if (raw.trim() === '') return null;
  const kind = type ?? 'number';
  if (kind === 'date') return raw;
  if (kind === 'datetime') {
    const match = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(raw.trim());
    if (!match) return null;
    const [, y, mo, d, h, mi, s, ms] = match;
    const at = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0), Number((ms ?? '0').padEnd(3, '0')));
    return Number.isNaN(at.getTime()) ? null : at.toISOString();
  }
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

/** The text an operand input shows for an operand: a `'datetime'` instant as local `datetime-local` text. */
export function operandText(operand: string | number | null | undefined, type: FilterInputType | undefined): string {
  if (operand == null) return '';
  if ((type ?? 'number') !== 'datetime') return String(operand);
  const at = new Date(String(operand));
  if (Number.isNaN(at.getTime())) return String(operand);
  const seconds = at.getSeconds() || at.getMilliseconds() ? `:${pad(at.getSeconds())}` : '';
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}${seconds}`;
}

/** A column's selection as the filter it applies, or null when it filters nothing. */
export function activeFilter(selection: FilterSelection, mode: FilterMode | undefined): DatatableFilter | null {
  if ((mode ?? 'values') === 'comparison') {
    return selection.operand == null || !selection.operator ? null : { values: [], inverse: false, operator: selection.operator, operand: selection.operand };
  }
  // "Exclude nothing" and "include nothing" both filter nothing: neither is sent.
  return selection.values.length ? { values: selection.values.map((v) => v.value as JsonValue), inverse: !!selection.inverse } : null;
}

/**
 * The panel's view of one column: the active filter from the model (labelled
 * from `known`, else by `labels.filterValue`), else the column's unapplied
 * draft (an operator picked, or "invert" pressed, with nothing to apply yet).
 */
export function selectionFromFilter(
  filter: DatatableFilter | undefined,
  draft: Partial<FilterSelection> | undefined,
  known: readonly DistinctValue[] | undefined,
  labels: DatatableLabels,
): FilterSelection {
  if (!filter) return { values: [], inverse: !!draft?.inverse, ...(draft?.operator ? { operator: draft.operator } : {}), operand: null };
  const values = (filter.values ?? []).map((value) => known?.find((v) => sameValue(v.value, value)) ?? { value, label: labels.filterValue(value) });
  return {
    values,
    inverse: !!filter.inverse,
    ...(filter.operator ? { operator: filter.operator } : {}),
    operand: filter.operand ?? null,
  };
}

/** `filters` with one column's entry replaced, or removed when `next` is null. */
export function withFilter(filters: DatatableFilters, name: string, next: DatatableFilter | null): DatatableFilters {
  const { [name]: _dropped, ...rest } = filters;
  return next ? { ...rest, [name]: next } : rest;
}

/**
 * The filters a request carries: entries for columns the table knows, each
 * still active, in canonical form. A model entry for an unknown column is kept
 * too: the consumer set it, and the server may know the field.
 */
export function requestFilters(filters: DatatableFilters | null | undefined): DatatableFilters {
  return Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([, f]) => !!f && ((f.values?.length ?? 0) > 0 || (f.operator !== undefined && f.operand !== undefined && f.operand !== null)),
    ),
  );
}

/** The value list computed from rows the table holds in full, sorted by label. */
export function localDistincts(rows: readonly unknown[], name: string, labels: DatatableLabels): DistinctValues {
  const values = rows.map((row) => (row as Record<string, unknown> | null | undefined)?.[name]);
  const unique = values.filter((v, i) => values.findIndex((w) => sameValue(v, w)) === i);
  const matching = unique.map((value) => ({ value, label: labels.filterValue(value) })).sort((a, b) => a.label.localeCompare(b.label));
  return { matching, remaining: [], hasMore: false };
}

/**
 * Re-derives `matching` / `remaining` from the snapshot and narrows both by
 * the search term. The snapshot (the list when the selection first became
 * non-empty) is the universe of listed values, so a selection can be widened
 * after the data it filters has shrunk; the loaded list only decides which
 * bucket each value falls into.
 */
export function bucketDistincts(loaded: DistinctValues | null, snapshot: readonly DistinctValue[] | null, term: string): DistinctValues | null {
  if (!loaded) return null;
  const needle = term.trim().toLowerCase();
  const matches = (v: DistinctValue) => needle === '' || v.label.toLowerCase().includes(needle);
  const present = [...loaded.matching, ...loaded.remaining];
  const matching = snapshot ? snapshot.filter((v) => includesValue(present, v.value)) : loaded.matching;
  const remaining = snapshot ? snapshot.filter((v) => !includesValue(present, v.value)) : loaded.remaining;
  return { matching: matching.filter(matches), remaining: remaining.filter(matches), hasMore: loaded.hasMore };
}

/**
 * The built-in panel's checkboxes, in order. Selected values lead and stay
 * there while the panel is open: re-sorting under a click would move the row
 * out from under the pointer.
 */
export const filterOptionsOf = (selection: FilterSelection, values: DistinctValues | null): DistinctValue[] => [
  ...selection.values,
  ...(values?.matching ?? []).filter((v) => !includesValue(selection.values, v.value)),
  ...(values?.remaining ?? []).filter((v) => !includesValue(selection.values, v.value)),
];

export const datatableFilterPanelId =(id: string, column: string) => `${id}-filter-${column}`;

export interface DatatableOptions {
  readonly id: string;
  /** Behaviour is attached (scroll tracking, keyboard): written as the readiness mark. */
  readonly hydrated?: boolean;
  readonly model: DatatableModel;
  readonly columns: readonly DatatableColumnDef[];
  readonly selectionMode: DatatableSelectionMode;
  readonly selectedIds: readonly string[];
  readonly cutIds: readonly string[];
  readonly focusedKey: string | null;
  readonly tree: boolean;
  readonly treeIndent: number;
  readonly sortColumns: readonly SortColumn[];
  readonly page: number;
  readonly perPage: number;
  readonly perPageOptions: readonly number[];
  readonly pagination: boolean;
  readonly loading: boolean;
  readonly busy: boolean;
  readonly emptyMessage: string;
  readonly caption: string | null;
  readonly label: string | null;
  readonly fill: boolean;
  readonly virtualScroll: boolean;
  readonly itemSize: number;
  readonly virtualBuffer: number;
  readonly scrollTop: number;
  readonly viewport: number;
  readonly resizableColumns: boolean;
  readonly columnWidths: Readonly<Record<string, number>>;
  readonly measured: boolean;
  readonly tableWidth: number | null;
  /** The column whose resize options are showing (or last showed). */
  readonly resizeColumn: string | null;
  /** That column's rendered width, px. */
  readonly resizeWidth: number;
  readonly indeterminate: ReadonlySet<string>;
  readonly rowLabel: ((row: unknown) => string) | null;
  readonly hrefFor: DatatableHrefFor | null;
  readonly announcement: string;
  /** Header row 1's height, px, for the sticky filter row's offset; 0 before it is measured. */
  readonly headerHeight: number;
  readonly filter: DatatableFilterView;
  readonly labels?: Partial<DatatableLabels> | null;
}

export const datatableResizePanelId = (id: string) => `${id}-resize`;

export const columnLabel =(column: DatatableColumnDef) => column.label ?? column.name;
export const isResizable = (column: DatatableColumnDef, tableWide: boolean) => column.resizable ?? tableWide;

export function connectDatatable(o: DatatableOptions): DatatableView {
  const labels: DatatableLabels = { ...DEFAULT_DATATABLE_LABELS, ...(o.labels ?? {}) };
  const multi = o.selectionMode === 'multiple' || o.selectionMode === 'checkbox';
  const selected = new Set(o.selectedIds);
  const cut = new Set(o.cutIds);
  const filterable = o.columns.some((c) => c.filterable);
  const headerRows = filterable ? 2 : 1;
  const colCount = o.columns.length + (multi ? 1 : 0) + (o.tree ? 1 : 0);
  const list = o.model.list;

  const win = o.virtualScroll
    ? virtualWindow({ scrollTop: o.scrollTop, viewport: o.viewport, itemSize: o.itemSize, total: list.length, buffer: o.virtualBuffer })
    : { start: 0, end: list.length, before: 0, after: 0 };
  const firstFocusable = list.findIndex((r) => !r.isPlaceholder);
  const focusKnown = o.focusedKey !== null && list.some((r) => r.key === o.focusedKey);
  const rovingKey = focusKnown ? o.focusedKey : (list[firstFocusable]?.key ?? null);
  const focusable = o.selectionMode !== 'none' || o.tree;

  const headers: DatatableHeaderCell[] = o.columns.map((column): DatatableHeaderCell => {
    const sortable = column.sortable ?? true;
    const at = o.sortColumns.findIndex((s) => s.property === column.name);
    const direction = at >= 0 ? o.sortColumns[at].direction : null;
    const width = o.columnWidths[column.name] ?? column.width;
    const label = columnLabel(column);
    const sortHref = sortable && o.hrefFor ? o.hrefFor({ page: 1, perPage: o.perPage, sortColumns: computeNextSort(o.sortColumns, column.name, false) }) : null;
    return {
      key: column.name,
      column,
      th: {
        scope: 'col',
        'data-column': column.name,
        'data-sortable': sortable ? 'true' : 'false',
        'aria-sort': direction ?? 'none',
      },
      style: (typeof width === 'number' ? { width: `${width}px`, 'min-width': `${width}px` } : {}) as Record<string, string>,
      sortable,
      sort: {
        class: 'header-cell header-sort',
        ...(sortHref === null ? { type: 'button' } : {}),
        'data-dt-sort': column.name,
      },
      sortHref,
      plain: { class: 'header-cell' },
      text: { class: 'header-text' },
      label,
      sortIndex: at >= 0 && o.sortColumns.length > 1 ? { class: 'sort-index' } : null,
      sortIndexText: at >= 0 ? String(at + 1) : '',
      // A focusable separator is a widget whose value is required. Until the
      // column has a width (server HTML, or a table not yet measured because it
      // has no rows) the grip is inert: hidden, out of the tab order.
      resize: !isResizable(column, o.resizableColumns)
        ? null
        : typeof width === 'number'
          ? {
              class: 'resize-handle',
              role: 'separator',
              tabindex: 0,
              'aria-orientation': 'vertical',
              'aria-label': labels.resizeColumn(label),
              'aria-valuemin': MIN_COLUMN_WIDTH,
              'aria-valuenow': Math.round(width),
              'data-dt-resize': column.name,
            }
          : { class: 'resize-handle', 'aria-hidden': 'true', 'data-dt-resize': column.name },
    };
  });

  const rows: DatatableRow[] = list.slice(win.start, win.end).map((flat, i) => {
    const rowIndex = o.model.indexOffset + win.start + i;
    const live = !flat.isPlaceholder;
    const isSelected = live && selected.has(flat.key);
    const hasChevron = o.tree && live && flat.childCount > 0;
    const firstText = live && o.columns[0] ? cellText(flat.row, o.columns[0], rowIndex).trim() : '';
    const named = (live && o.rowLabel?.(flat.row)?.trim()) || firstText;
    return {
      key: flat.key,
      tr: {
        role: 'row',
        'aria-rowindex': rowIndex + 1 + headerRows,
        'aria-level': o.tree ? flat.depth + 1 : null,
        'aria-expanded': o.tree && flat.childCount > 0 ? (flat.isExpanded ? 'true' : 'false') : null,
        'aria-busy': flat.isPlaceholder ? 'true' : null,
        'aria-selected': live && o.selectionMode !== 'none' ? (isSelected ? 'true' : 'false') : null,
        'data-row-key': flat.key,
        'data-selected': isSelected ? 'true' : 'false',
        'data-cut': live && cut.has(flat.key) ? 'true' : 'false',
        'data-focused': live && o.focusedKey === flat.key ? 'true' : 'false',
        'data-placeholder': flat.isPlaceholder ? 'true' : 'false',
        'data-depth': o.tree ? String(flat.depth) : null,
        'data-clickable': live ? 'true' : 'false',
        tabindex: live && focusable ? (flat.key === rovingKey ? 0 : -1) : null,
      },
      chevronCell: o.tree ? { class: 'tree-chevron-cell' } : null,
      chevronStyle: { '--mp-datatable-depth': String(flat.depth) },
      chevron: hasChevron
        ? {
            class: 'tree-chevron',
            type: 'button',
            tabindex: -1,
            'aria-label': flat.isExpanded ? labels.collapseRow : labels.expandRow,
            'aria-expanded': flat.isExpanded ? 'true' : 'false',
            'data-expanded': flat.isExpanded ? 'true' : 'false',
            'data-dt-toggle': '',
          }
        : null,
      chevronText: flat.isExpanded ? '▾' : '▸',
      checkCell: multi
        ? { class: o.selectionMode === 'checkbox' ? 'checkbox-cell checkbox-cell-toggles' : 'checkbox-cell', 'data-dt-check-cell': '' }
        : null,
      check:
        multi && live
          ? {
              class: 'form-check-input',
              type: 'checkbox',
              tabindex: -1,
              'aria-label': named ? labels.selectRowNamed(named) : labels.selectRow(rowIndex + 1),
              'data-dt-check': '',
            }
          : null,
      checked: isSelected,
      indeterminate: live && !isSelected && o.indeterminate.has(flat.key),
      placeholder: flat.isPlaceholder
        ? { class: 'tree-placeholder-cell', colspan: Math.max(1, o.columns.length), 'aria-label': labels.loading }
        : null,
      row: flat.row,
      rowIndex,
      ctx: { depth: flat.depth, isExpanded: flat.isExpanded, isPlaceholder: flat.isPlaceholder },
      cells: live
        ? o.columns.map((column) => ({
            key: column.name,
            column,
            td: { class: column.cellClass ?? null, 'data-column': column.name },
            text: cellText(flat.row, column, rowIndex),
          }))
        : [],
    };
  });

  const spacer = (height: number): DatatableSpacer | null =>
    height > 0
      ? { tr: { class: 'virtual-spacer', 'aria-hidden': 'true' }, td: { colspan: colCount }, style: { height: `${height}px` } }
      : null;

  const showFooter = o.pagination && !o.tree;
  const pager = (
    key: string,
    className: string,
    pages: readonly number[],
    current: number,
    arrows: boolean,
    boxes: number,
    navigation: string,
    data: string,
    href: ((n: number) => string) | null,
    pageLabel?: (n: number) => string,
  ): DatatablePager => {
    const p = connectPagination({
      pageNumbers: pages,
      selectedPageNumber: current,
      numberOfBoxes: boxes,
      showArrows: arrows,
      size: 'medium',
      labels: { navigation, ...(pageLabel ? { page: pageLabel } : {}) },
      hrefFor: href,
    });
    return {
      key,
      nav: { ...p.nav, class: className },
      list: { class: p.listClass },
      entries: p.entries.map((e: PaginationEntry) => ({
        key: e.key,
        item: { class: e.itemClass },
        link: { ...e.attrs, ...(e.kind === 'link' && e.target !== null ? { [data]: e.target } : {}) },
        text: e.text,
        gap: e.kind === 'gap',
        anchor: e.kind === 'link' && p.tag === 'a',
        href: e.kind === 'link' ? (e.href ?? '') : '',
      })),
    };
  };
  const sortCopy = [...o.sortColumns];
  const pagers = showFooter
    ? [
        pager('per-page', 'datatable-per-page', o.perPageOptions, o.perPage, false, 0, labels.rowsPerPage, 'data-dt-per-page',
          o.hrefFor ? (n) => o.hrefFor!({ page: 1, perPage: n, sortColumns: sortCopy }) : null, (n) => String(n)),
        pager('pages', 'datatable-pagination', Array.from({ length: o.model.totalPages }, (_, i) => i + 1), o.page, true, 7,
          labels.pagination, 'data-dt-page',
          o.hrefFor ? (n) => o.hrefFor!({ page: n, perPage: o.perPage, sortColumns: sortCopy }) : null),
      ]
    : [];

  const f = o.filter;
  const panelIdOf = (name: string) => datatableFilterPanelId(o.id, name);
  const filterPanel = (column: DatatableColumnDef): DatatableFilterPanel => {
    const name = column.name;
    const label = columnLabel(column);
    const selection = filterSelectionOf(column, f.selections);
    const ctx: FilterContext = {
      values: f.values,
      loading: f.loading,
      selection,
      term: f.term,
      search: (term) => f.commands.search(name, term),
      apply: (values, inverse) => f.commands.apply(name, values, inverse),
      compare: (operator, operand) => f.commands.compare(name, operator, operand),
      clear: () => f.commands.clear(name),
      close: () => f.commands.close(),
    };
    const mode = column.filterMode ?? 'values';
    const comparing = mode === 'comparison';
    const custom = mode === 'custom';
    const operators = column.filterOperators?.length ? column.filterOperators : DEFAULT_FILTER_OPERATORS;
    const operator = selection.operator ?? operators[0];
    const picked = selection.values;
    const listed = filterOptionsOf(selection, f.values);
    const datetimeApplied = comparing && column.filterInputType === 'datetime' && selection.operand != null;
    return {
      column,
      ctx,
      body: { class: 'filter-panel-body' },
      clear: {
        class: 'filter-clear',
        type: 'button',
        disabled: comparing ? selection.operand == null : picked.length === 0 && !selection.inverse,
        'data-dt-filter-clear': '',
      },
      clearText: labels.filterClear(label),
      custom,
      list: comparing || custom
        ? null
        : {
            search: { class: 'filter-search', type: 'search', 'aria-label': labels.filterSearch, 'data-dt-filter-search': '' },
            term: f.term,
            invert: { class: 'filter-invert', type: 'button', 'aria-pressed': selection.inverse ? 'true' : 'false', 'data-dt-filter-invert': '' },
            invertText: labels.filterInvert,
            group: { class: 'filter-options', role: 'group', 'aria-label': labels.filterGroup(label) },
            loading: f.loading ? { class: 'filter-loading' } : null,
            loadingText: labels.loading,
            options: listed.map((v, i) => ({
              key: `${i}:${v.label}`,
              label: { class: f.values && includesValue(f.values.remaining, v.value) ? 'filter-option filter-remaining' : 'filter-option' },
              input: { type: 'checkbox', 'data-dt-filter-value': i },
              checked: includesValue(picked, v.value),
              text: v.label,
            })),
            noValues: listed.length === 0 && !f.loading ? { class: 'filter-no-values' } : null,
            noValuesText: labels.filterNoValues,
            hasMore: f.values?.hasMore ? { class: 'filter-has-more' } : null,
            hasMoreText: labels.filterHasMore,
          },
      comparison: comparing
        ? {
            wrap: { class: 'filter-comparison' },
            operator: { class: 'filter-operator', 'aria-label': labels.filterOperator, 'data-dt-filter-operator': '' },
            operatorValue: operator,
            operators: operators.map((op) => ({
              key: op,
              option: { value: op, selected: op === operator },
              text: `${FILTER_OPERATOR_SYMBOLS[op]} ${labels.filterOperatorLabel(op)}`,
            })),
            operand: {
              class: 'filter-operand',
              type: column.filterInputType === 'datetime' ? 'datetime-local' : (column.filterInputType ?? 'number'),
              'aria-label': labels.filterOperand,
              // The read-back says which instant a typed local time resolved to (a DST gap moves it).
              'aria-describedby': datetimeApplied ? `${panelIdOf(name)}-applied` : null,
              'data-dt-filter-operand': '',
            },
            operandText: f.operandTexts[name] ?? operandText(selection.operand, column.filterInputType),
            applied: datetimeApplied ? { class: 'filter-applied form-text', id: `${panelIdOf(name)}-applied` } : null,
            appliedText: datetimeApplied ? labels.filterApplied(new Date(String(selection.operand)).toLocaleString()) : '',
          }
        : null,
    };
  };
  const filterCells: DatatableFilterCell[] = filterable
    ? o.columns.map((column) => {
        const label = columnLabel(column);
        const open = f.column === column.name;
        const panelId = datatableFilterPanelId(o.id, column.name);
        const active = activeFilter(filterSelectionOf(column, f.selections), column.filterMode) !== null;
        return {
          key: column.name,
          // A column with no filter still gets its cell: it belongs to the grid, so it is not hidden.
          th: { class: 'filter-cell p-0', scope: 'col', 'data-column': column.name },
          trigger: column.filterable
            ? {
                class: ['filter-trigger p-2 rounded-0', active ? 'active' : '', open ? 'open' : ''].filter(Boolean).join(' '),
                type: 'button',
                // The browser toggles the panel (no JavaScript needed to open it).
                popovertarget: panelId,
                'aria-expanded': open ? 'true' : 'false',
                'aria-controls': panelId,
                // "Filtered" is part of the name: the active styling is not visible to everyone.
                'aria-label': active ? labels.filterColumnActive(label, column.filterSummary) : labels.filterColumn(label),
                'data-dt-filter': column.name,
              }
            : null,
          icon: { class: 'filter-icon', viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
          path: { d: 'M2 3h12l-4.5 5.25V13L6.5 11.5V8.25L2 3z' },
          summary: column.filterSummary ? { class: 'filter-summary' } : null,
          summaryText: column.filterSummary ?? '',
          // Non-modal on purpose (#416): the rows whose values are being picked stay available.
          panel: column.filterable
            ? {
                class: 'filter-panel',
                id: panelId,
                popover: 'auto',
                role: 'dialog',
                'aria-label': labels.filterColumn(label),
                'data-dt-filter-panel': column.name,
              }
            : null,
          open: column.filterable && open ? filterPanel(column) : null,
        };
      })
    : [];

  const resized = o.columns.find((c) => c.name === o.resizeColumn);
  const resizeName = resized ? columnLabel(resized) : '';
  const empty = rows.length === 0;
  const stateText = o.loading ? `${labels.loading}…` : o.emptyMessage;
  return {
    root: { class: 'datatable', 'data-fill': o.fill ? 'true' : 'false', 'data-dt-id': o.id, ...hydratedAttr(o.hydrated ?? false) },
    live: { class: 'visually-hidden', 'aria-live': 'polite', 'aria-atomic': 'true' },
    announcement: o.announcement,
    shell: { class: 'datatable-shell' },
    scroll: { class: o.virtualScroll ? 'datatable-scroll datatable-virtual' : 'datatable-scroll', role: 'presentation' },
    table: {
      id: `${o.id}-table`,
      class: o.measured ? 'measured' : null,
      role: o.tree ? 'treegrid' : o.selectionMode !== 'none' ? 'grid' : null,
      'aria-multiselectable': multi ? 'true' : null,
      'aria-rowcount': o.model.rowCount + headerRows,
      'aria-colcount': colCount,
      'aria-busy': o.busy ? 'true' : null,
      'aria-label': o.label,
    },
    tableStyle: {
      '--mp-datatable-tree-indent': `${o.treeIndent}rem`,
      ...(o.tableWidth === null ? {} : { width: `${o.tableWidth}px` }),
      ...(filterable && o.headerHeight > 0 ? { '--mp-datatable-header-height': `${o.headerHeight}px` } : {}),
    },
    caption: o.caption || null,
    captionBag: {},
    thead: {},
    headerRow: { role: 'row', 'aria-rowindex': 1 },
    chevronHeader: o.tree ? { class: 'tree-chevron-cell', scope: 'col', 'aria-label': labels.treeChevronColumn } : null,
    checkHeader: multi ? { class: 'checkbox-cell', scope: 'col' } : null,
    deselectAll: {
      class: 'form-check-input',
      type: 'checkbox',
      'aria-label': labels.deselectAll,
      'data-hidden': selected.size === 0 ? 'true' : 'false',
      'data-dt-deselect-all': '',
    },
    anySelected: selected.size > 0,
    headers,
    tbody: {},
    stateRow: {},
    stateCell: o.loading || empty ? { class: o.loading ? 'loading-state' : 'empty-state', colspan: colCount } : null,
    stateText,
    spacerTop: o.loading || empty ? null : spacer(win.before),
    spacerBottom: o.loading || empty ? null : spacer(win.after),
    rows: o.loading ? [] : rows,
    footer: showFooter ? { class: 'datatable-footer' } : null,
    pagers,
    resizePanel: {
      class: 'resize-panel',
      id: datatableResizePanelId(o.id),
      popover: 'auto',
      role: 'dialog',
      'aria-label': labels.resizeColumnOptions(resizeName),
    },
    resizeSteps: { class: 'resize-panel-steps' },
    narrower: { class: 'resize-panel-step', type: 'button', 'aria-label': labels.narrowerColumn(resizeName), 'data-dt-step': -1 },
    wider: { class: 'resize-panel-step', type: 'button', 'aria-label': labels.widerColumn(resizeName), 'data-dt-step': 1 },
    stepGlyph: { 'aria-hidden': 'true' },
    widthOutput: { class: 'resize-panel-width' },
    widthText: labels.columnWidth(Math.round(o.resizeWidth)),
    fit: { class: 'resize-panel-action', type: 'button', 'data-dt-fit': '' },
    reset: { class: 'resize-panel-action', type: 'button', 'data-dt-reset': '' },
    filterRow: filterable ? { class: 'filter-row', role: 'row', 'aria-rowindex': 2 } : null,
    filterChevronCell: filterable && o.tree ? { class: 'filter-cell tree-chevron-cell' } : null,
    filterCheckCell: filterable && multi ? { class: 'filter-cell checkbox-cell' } : null,
    filterCells,
    labels,
  };
}
