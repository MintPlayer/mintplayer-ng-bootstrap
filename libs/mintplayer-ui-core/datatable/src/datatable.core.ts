import { Announcer } from '@mintplayer/ui-core/announce';
import { SupersedingRequest } from '@mintplayer/ui-core/async';
import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { trackPopovers } from '@mintplayer/ui-core/overlay';
import { isPlainClick } from '@mintplayer/ui-core/pagination';
import { canonicalJson, canonicalValue, hashKey, type JsonValue } from '@mintplayer/ui-core/transfer-state';
import { sameWindow, trackScroll, virtualWindow } from '@mintplayer/ui-core/virtual-window';
import {
  KEYBOARD_RESIZE_STEP,
  MIN_REFIT_SCALE,
  MIN_COLUMN_WIDTH,
  RESIZE_TAP_SLOP,
  fittedColumnWidth,
  resizedColumnWidth,
} from './column-resize';
import {
  bucketDistincts,
  columnLabel,
  connectDatatable,
  activeFilter,
  EMPTY_SELECTION,
  filterOptionsOf,
  localDistincts,
  parseOperand,
  requestFilters,
  sameValue,
  selectionFromFilter,
  withFilter,
  type DatatableFilterCommands,
  datatableModel,
  defaultRowKey,
  descendantsOf,
  indeterminateKeys,
  parseSelectionMode,
  rowId,
  type DatatableHrefFor,
  type DatatableModel,
  type DatatableReloadOptions,
  type DatatableSelectionMode,
  type DatatableView,
  type FlatRow,
  type RowEventDetail,
  type SelectionChangeEventDetail,
} from './datatable';
import { computeNextSort, type SortColumn } from './sort';
import type { DatatableColumnDef, RowKey } from './types/column-def';
import type {
  DatatableFilters,
  DistinctsRequest,
  DistinctValue,
  DistinctValues,
  FilterOperator,
  FilterSelection,
} from './types/filter';
import { DEFAULT_DATATABLE_LABELS, type DatatableLabels } from './types/labels';
import type { DatatableFetch, TreeIdKey, TreeRowExpandDetail, TreeSelectionStrategy } from './types/tree';

/**
 * The datatable's core (PRD #437 D10): what the generated Angular, React, Vue
 * and Lit components host. `datatable.component.ts` is their manifest and
 * `templates/datatable.view.vue` their markup.
 *
 * Rows come from `data` (the table sorts and pages them) or from `fetch` (the
 * server does, and a virtual table pulls the pages it scrolls to). Sort, page,
 * page size, selection and expansion are two-way inputs.
 */
export interface DatatableInputs {
  columns: DatatableColumnDef[];
  data: unknown[];
  /**
   * Server-side rows: the table calls it for every page, sort, filter and
   * expanded parent. `any`, so a consumer's typed `DatatableFetch<Row, Params>` binds.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetch: DatatableFetch<any, any> | null;
  /**
   * The column filters, by column name (#448): a two-way model. The table
   * never filters; `fetch` (or the consumer filtering `data`) applies them.
   */
  filters: DatatableFilters | null;
  /** The consumer's own query context, sent verbatim as `params`. Must be JSON (#448 D2). */
  fetchParams: JsonValue | null;
  /**
   * Turns on the server-side first page (#448 D3): the server prefetches it
   * and hands it to the client under this key plus the request's identity.
   * Unique per table on a page. Without it both sides render loading.
   */
  stateKey: string | null;
  caption: string | null;
  labels: Partial<DatatableLabels> | null;
  /** Names the table when no `aria-label` does. */
  inputLabel: string | null;
  sortColumns: SortColumn[];
  page: number;
  perPage: number;
  perPageOptions: number[];
  pagination: boolean;
  /** Sort `data` client-side; ignored with `fetch` (the server sorts). */
  autoSort: boolean;
  selectionMode: DatatableSelectionMode;
  /** Row keys. */
  selectedIds: string[];
  /** Rows marked as cut (dimmed), by key. */
  cutIds: string[];
  /** The roving tab stop, by key. */
  focusedRowKey: string | null;
  /** Names a row's checkbox; defaults to the first cell's text. */
  rowLabel: ((row: unknown) => string) | null;
  rowKey: RowKey | null;
  tree: boolean;
  idKey: TreeIdKey | null;
  childCountKey: string | null;
  /** Indent per tree level, rem. */
  treeIndent: number;
  expandedIds: unknown[];
  selectionStrategy: TreeSelectionStrategy;
  loading: boolean;
  emptyMessage: string;
  virtualScroll: boolean;
  /** Row height in virtual mode, px. */
  itemSize: number;
  virtualBuffer: number;
  /** Fill a sized parent: the header sticks to its top and the footer to its bottom. */
  fill: boolean;
  resizableColumns: boolean;
  /** Renders sort and page controls as links, so they work without JavaScript. */
  hrefFor: DatatableHrefFor | null;
  /** The filter panels' value lists; resolve null for a column the table should list from its own rows. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  distincts: ((request: DistinctsRequest<any>) => Promise<DistinctValues | null>) | null;
}

export interface DatatableState {
  sortColumns: SortColumn[];
  page: number;
  perPage: number;
  selectedIds: string[];
  expandedIds: unknown[];
  focusedKey: string | null;
  /** Page 1 of `fetch`, or null before it loads. */
  fetched: unknown[] | null;
  /** The request key `fetched` answers; set from a prefetched seed, so the client skips refetching it. */
  fetchedKey: string | null;
  /** The late `fetch` that `adopt` applied the server's seed for: only that function keeps `fetched` as its page 1, once. */
  seededFor: DatatableFetch<any, any> | null;
  totalRecords: number | null;
  pageCache: ReadonlyMap<number, readonly unknown[]>;
  childCache: ReadonlyMap<unknown, readonly unknown[]>;
  childTotals: ReadonlyMap<unknown, number>;
  fetching: boolean;
  scrollTop: number;
  viewport: number;
  columnWidths: Readonly<Record<string, number>>;
  measured: boolean;
  /** The table's width while the user owns the column widths; null while it fills its container. */
  tableWidth: number | null;
  resizeColumn: string | null;
  resizeWidth: number;
  announcement: string;
  headerHeight: number;
  /** The column whose filter panel is open. */
  filterColumn: string | null;
  /** The `filters` model: only active filters, in canonical form. */
  filters: DatatableFilters;
  /** What a panel shows but does not filter by yet: an operator picked, "exclude" pressed with nothing ticked. */
  filterDrafts: Readonly<Record<string, Partial<FilterSelection>>>;
  /** The labels of the values last applied, by column, so a closed panel still names them. */
  filterValueLabels: Readonly<Record<string, DistinctValue[]>>;
  /** The list when a column's selection became non-empty, by column. */
  filterSnapshots: Readonly<Record<string, DistinctValue[]>>;
  /** The comparison operand's raw text, by column. */
  filterOperandTexts: Readonly<Record<string, string>>;
  /** The open panel's list as loaded, never narrowed in place. */
  filterLoaded: DistinctValues | null;
  /** The term filterLoaded was loaded for; null when nothing loaded. */
  filterLoadedTerm: string | null;
  /** filterLoaded came from the table's own rows (and follows them). */
  filterFromLocal: boolean;
  filterTerm: string;
  filterLoading: boolean;
}

export interface DatatableEvents {
  sortColumnsChange: SortColumn[];
  pageChange: number;
  perPageChange: number;
  selectedIdsChange: string[];
  expandedIdsChange: unknown[];
  rowClick: RowEventDetail;
  rowDblClick: RowEventDetail;
  /** Call `originalEvent.preventDefault()` to suppress the browser's menu. */
  rowContextMenu: RowEventDetail;
  selectionChanged: SelectionChangeEventDetail;
  rowExpand: TreeRowExpandDetail;
  rowCollapse: TreeRowExpandDetail;
  loadError: DatatableLoadErrorDetail;
  filtersChange: DatatableFilters;
}

export interface DatatableLoadErrorDetail {
  error: unknown;
}

export interface DatatableMethods {
  /** Re-query `fetch` for the current sort, page and page size. The selection survives. */
  reload(options?: DatatableReloadOptions): void;
}

type Api = CoreApi<DatatableInputs, DatatableState, DatatableEvents>;

/** Server viewport fallback: the first rows render as real HTML before anything is measured. */
const SSR_VIEWPORT = 480;

const sameSort = (a: readonly SortColumn[], b: readonly SortColumn[]) =>
  a.length === b.length && a.every((c, i) => c.property === b[i].property && c.direction === b[i].direction);
const positive = (v: unknown, fallback: number) => Math.max(1, Math.floor(Number(v) || fallback));

type QueryState = Pick<DatatableState, 'sortColumns' | 'page' | 'perPage' | 'filters'>;

/**
 * The identity of a root query (#448): sort, page size, page (always 1 when
 * virtual), filters and params, canonically. It dedupes reloads, names the
 * page a seed answers, and keys the transfer. Throws `NonJsonValueError` on a
 * `fetchParams` that is not JSON (D2).
 */
export function requestKeyOf(inputs: Readonly<DatatableInputs>, s: QueryState): string {
  return JSON.stringify({
    s: s.sortColumns.map((c) => [c.property, c.direction]),
    pp: s.perPage,
    p: inputs.virtualScroll ? 1 : s.page,
    f: canonicalValue(requestFilters(s.filters), 'filters'),
    q: canonicalValue(inputs.fetchParams ?? null, 'fetchParams'),
  });
}

/** The query the inputs alone describe: what the server prefetches and the client starts from. */
const queryOf = (inputs: Readonly<DatatableInputs>): QueryState => ({
  sortColumns: [...(inputs.sortColumns ?? [])],
  page: positive(inputs.page, 1),
  perPage: positive(inputs.perPage, 20),
  filters: requestFilters(inputs.filters),
});

const fetchPage = (inputs: Readonly<DatatableInputs>, s: QueryState, parentId: unknown | null, page: number, signal: AbortSignal) =>
  inputs.fetch!({
    parentId,
    page,
    perPage: s.perPage,
    sortColumns: [...s.sortColumns],
    filters: requestFilters(s.filters),
    params: inputs.fetchParams ?? undefined,
    signal,
  });

/** What `prefetch` resolves and the client is seeded with: page 1 of the query named by `key`. */
interface DatatableSeed {
  key: string;
  rows: unknown[];
  totalRecords: number | null;
}
const isSeed = (seed: unknown): seed is DatatableSeed =>
  !!seed && typeof (seed as DatatableSeed).key === 'string' && Array.isArray((seed as DatatableSeed).rows);

const total = (value: number | undefined | null) => (value == null ? null : Math.max(0, Math.floor(value)));

/** The labels a column's values are known by: last applied, then snapshotted, then listed in its open panel. */
const knownValues = (s: Readonly<DatatableState>, name: string): DistinctValue[] => [
  ...(s.filterValueLabels[name] ?? []),
  ...(s.filterSnapshots[name] ?? []),
  ...(s.filterColumn === name && s.filterLoaded ? [...s.filterLoaded.matching, ...s.filterLoaded.remaining] : []),
];

const selectionsMemo = new WeakMap<object, { inputs: object; selections: Record<string, FilterSelection> }>();
/** Every column's panel selection, from the model plus drafts; once per snapshot. */
function selectionsOf(inputs: Readonly<DatatableInputs>, s: Readonly<DatatableState>): Record<string, FilterSelection> {
  const hit = selectionsMemo.get(s);
  if (hit && hit.inputs === inputs) return hit.selections;
  const labels: DatatableLabels = { ...DEFAULT_DATATABLE_LABELS, ...(inputs.labels ?? {}) };
  const names = [...new Set([...(inputs.columns ?? []).map((c) => c.name), ...Object.keys(s.filters), ...Object.keys(s.filterDrafts)])];
  const selections = Object.fromEntries(
    names.map((name) => [name, selectionFromFilter(s.filters[name], s.filterDrafts[name], knownValues(s, name), labels)]),
  );
  selectionsMemo.set(s, { inputs, selections });
  return selections;
}

/** `record` with `name` set to `value`, or removed when it is null. */
const withEntry = <T,>(record: Readonly<Record<string, T>>, name: string, value: T | null): Record<string, T> => {
  const { [name]: _dropped, ...rest } = record;
  return value === null ? rest : { ...rest, [name]: value };
};

let warnedNoStateKey = false;

const modelMemo = new WeakMap<object, { inputs: object; model: DatatableModel }>();

/** The visible list for these inputs and state, computed once per snapshot. */
export function modelOf(inputs: Readonly<DatatableInputs>, state: Readonly<DatatableState>): DatatableModel {
  const hit = modelMemo.get(state);
  if (hit && hit.inputs === inputs) return hit.model;
  const model = datatableModel({
    rows: (inputs.fetch ? state.fetched : inputs.data) ?? [],
    totalRecords: inputs.fetch ? state.totalRecords : null,
    pageCache: state.pageCache,
    childCache: state.childCache,
    childTotals: state.childTotals,
    tree: !!inputs.tree,
    virtualScroll: !!inputs.virtualScroll,
    pagination: !!inputs.pagination,
    autoSort: inputs.autoSort !== false && !inputs.fetch,
    sortColumns: state.sortColumns,
    page: state.page,
    perPage: state.perPage,
    rowKey: inputs.rowKey ?? defaultRowKey,
    idKey: inputs.idKey ?? null,
    childCountKey: inputs.childCountKey ?? null,
    expandedIds: state.expandedIds,
  });
  modelMemo.set(state, { inputs, model });
  return model;
}

const windowOf = (inputs: Readonly<DatatableInputs>, state: Readonly<DatatableState>, total: number) =>
  virtualWindow({
    scrollTop: state.scrollTop,
    viewport: state.viewport || SSR_VIEWPORT,
    itemSize: inputs.itemSize,
    total,
    buffer: inputs.virtualBuffer,
  });

/** Per host: what `inputsChanged` and the methods reach of `attach`'s closure. */
interface Controller {
  inputsChanged(prev: Readonly<DatatableInputs>): void;
  reload(options?: DatatableReloadOptions): void;
}
const controllers = new WeakMap<HTMLElement, Controller>();

/** The type-to-search quiet time shared with the typeahead and tree-select (#436 D6). */
const FILTER_SEARCH_DEBOUNCE_MS = 200;
/** Typing an operand is a server query per pause, not per keystroke (#448). */
const FILTER_OPERAND_DEBOUNCE_MS = 300;

/**
 * By instance id: the filter commands of each attached table. The view is
 * pure and has no host, so the `filter` slot's ctx reaches its table's
 * closure through the id the root carries as data-dt-id.
 */
const filterRegistry = new Map<string, DatatableFilterCommands>();
const commandsMemo = new Map<string, DatatableFilterCommands>();
const commandsFor = (id: string): DatatableFilterCommands => {
  const hit = commandsMemo.get(id);
  if (hit) return hit;
  const commands: DatatableFilterCommands = {
    search: (column, term) => filterRegistry.get(id)?.search(column, term),
    apply: (column, values, inverse) => filterRegistry.get(id)?.apply(column, values, inverse),
    compare: (column, operator, operand) => filterRegistry.get(id)?.compare(column, operator, operand),
    clear: (column) => filterRegistry.get(id)?.clear(column),
    close: () => filterRegistry.get(id)?.close(),
  };
  commandsMemo.set(id, commands);
  return commands;
};

export const datatableCore = defineCore<
  DatatableInputs,
  DatatableState,
  { view: DatatableView },
  DatatableEvents,
  undefined,
  undefined,
  DatatableMethods
>({
  state: (inputs, seed) => {
    const query = queryOf(inputs);
    // A seed for another query (the inputs moved on) is ignored, never shown as this one.
    const seeded = !!inputs.fetch && isSeed(seed) && seed.key === requestKeyOf(inputs, query) ? seed : null;
    return {
      ...query,
      selectedIds: [...(inputs.selectedIds ?? [])],
      expandedIds: [...(inputs.expandedIds ?? [])],
      focusedKey: inputs.focusedRowKey ?? null,
      fetched: seeded ? [...seeded.rows] : null,
      fetchedKey: seeded?.key ?? null,
      seededFor: null,
      totalRecords: seeded ? total(seeded.totalRecords) : null,
      pageCache: new Map(),
      childCache: new Map(),
      childTotals: new Map(),
      fetching: !!inputs.fetch && !seeded,
      scrollTop: 0,
      viewport: 0,
      columnWidths: {},
      measured: false,
      tableWidth: null,
      resizeColumn: null,
      resizeWidth: 0,
      announcement: '',
      headerHeight: 0,
      filterColumn: null,
      filterDrafts: {},
      filterValueLabels: {},
      filterSnapshots: {},
      filterOperandTexts: {},
      filterLoaded: null,
      filterLoadedTerm: null,
      filterFromLocal: false,
      filterTerm: '',
      filterLoading: false,
    };
  },
  transferKey: (inputs) => {
    if (!inputs.fetch) return undefined;
    if (!inputs.stateKey) {
      if (!warnedNoStateKey) {
        warnedNoStateKey = true;
        console.warn('[mp-datatable] a fetch table without stateKey renders loading on the server and fetches on the client; set stateKey to prefetch its first page (#448).');
      }
      return undefined;
    }
    return `mp-dt:${inputs.stateKey}:${hashKey(requestKeyOf(inputs, queryOf(inputs)))}`;
  },
  prefetch: (inputs, signal) => {
    if (!inputs.fetch || !inputs.stateKey) return undefined;
    const query = queryOf(inputs);
    const page = inputs.virtualScroll ? 1 : query.page;
    return fetchPage(inputs, query, null, page, signal).then(
      (resp): DatatableSeed => ({ key: requestKeyOf(inputs, query), rows: [...(resp?.data ?? [])], totalRecords: total(resp?.totalRecords) }),
    );
  },
  adopt: (state, inputs, seed) => {
    const query = queryOf(inputs);
    if (!inputs.fetch || !isSeed(seed) || seed.key !== requestKeyOf(inputs, query)) return state;
    return { ...state, ...query, fetched: [...seed.rows], fetchedKey: seed.key, seededFor: inputs.fetch, totalRecords: total(seed.totalRecords), fetching: false };
  },
  view: ({ inputs, state, id, hydrated, label }) => {
    const model = modelOf(inputs, state);
    const mode = parseSelectionMode(inputs.selectionMode);
    const cascading = !!inputs.tree && inputs.selectionStrategy === 'cascading';
    const selected = new Set(state.selectedIds);
    return {
      view: connectDatatable({
        id,
        hydrated,
        model,
        columns: inputs.columns ?? [],
        selectionMode: mode,
        selectedIds: state.selectedIds,
        cutIds: inputs.cutIds ?? [],
        focusedKey: state.focusedKey,
        tree: !!inputs.tree,
        treeIndent: Number(inputs.treeIndent) || 1.25,
        sortColumns: state.sortColumns,
        page: state.page,
        perPage: state.perPage,
        perPageOptions: inputs.perPageOptions?.length ? inputs.perPageOptions : [10, 20, 50],
        pagination: !!inputs.pagination,
        loading: !!inputs.loading || (!!inputs.fetch && state.fetched === null),
        busy: !!inputs.loading || state.fetching,
        emptyMessage: inputs.emptyMessage ?? 'No data',
        caption: inputs.caption ?? null,
        label: label ?? inputs.inputLabel ?? null,
        fill: !!inputs.fill,
        virtualScroll: !!inputs.virtualScroll,
        itemSize: Number(inputs.itemSize) || 40,
        virtualBuffer: Number(inputs.virtualBuffer) || 0,
        scrollTop: state.scrollTop,
        viewport: state.viewport || SSR_VIEWPORT,
        resizableColumns: inputs.resizableColumns !== false,
        columnWidths: state.columnWidths,
        measured: state.measured,
        tableWidth: state.tableWidth,
        resizeColumn: state.resizeColumn,
        resizeWidth: state.resizeWidth,
        indeterminate: cascading
          ? indeterminateKeys(model, (inputs.fetch ? state.fetched : inputs.data) ?? [], state.childCache, inputs.idKey ?? null, selected)
          : new Set(),
        rowLabel: inputs.rowLabel ?? null,
        hrefFor: inputs.hrefFor ?? null,
        announcement: state.announcement,
        headerHeight: state.headerHeight,
        filter: {
          column: state.filterColumn,
          selections: selectionsOf(inputs, state),
          operandTexts: state.filterOperandTexts,
          values:
            state.filterColumn === null
              ? null
              : bucketDistincts(state.filterLoaded, state.filterSnapshots[state.filterColumn] ?? null, state.filterTerm),
          loading: state.filterLoading,
          term: state.filterTerm,
          commands: commandsFor(id),
        },
        labels: inputs.labels,
      }),
    };
  },
  attach: (api) => {
    const host = api.host;
    const labels = (): DatatableLabels => ({ ...DEFAULT_DATATABLE_LABELS, ...(api.inputs().labels ?? {}) });
    const announcer = new Announcer();
    const unsubscribe = announcer.subscribe((s) => api.setState({ announcement: s.text }));
    const model = () => modelOf(api.inputs(), api.state());
    const mode = () => parseSelectionMode(api.inputs().selectionMode);
    const columns = () => api.inputs().columns ?? [];
    const scroller = () => (api.inputs().fill ? host : host.querySelector<HTMLElement>('.datatable-scroll'));
    // Column names are consumer data, so they are compared, never spliced into
    // a selector (and jsdom has no CSS.escape).
    const withAttr = (selector: string, attr: string, value: string) =>
      [...host.querySelectorAll<HTMLElement>(selector)].filter((el) => el.getAttribute(attr) === value);
    const headerCell = (name: string): HTMLElement | null => withAttr('thead tr:first-child th[data-column]', 'data-column', name)[0] ?? null;
    const entryOf = (key: string): { flat: FlatRow; index: number } | null => {
      const list = model().list;
      const at = list.findIndex((r) => r.key === key);
      return at < 0 || list[at].isPlaceholder ? null : { flat: list[at], index: at };
    };
    const rowIndexOf = (index: number) => model().indexOffset + index;

    // ── Fetch ────────────────────────────────────────────────────────────
    let generation = 0;
    let abort = new AbortController();
    // A seeded page 1 (#448) is already the answer to its query: the first reload skips it.
    // An adopted seed is checked by identity in inputsChanged, which the runtime calls at
    // attach with every input change made before it (fetch → null → another fetch reloads).
    let lastKey: string | null = api.state().fetchedKey;
    let reloadQueued = false;
    /** Set while typing in an operand holds reloads back; the timer reloads once typing pauses. */
    let filterHold: ReturnType<typeof setTimeout> | null = null;
    const pendingPages = new Set<number>();
    const pendingChildren = new Set<unknown>();
    const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';
    const failed = (error: unknown) => {
      if (!isAbort(error)) api.emit('loadError', { error });
    };
    const invalidate = () => {
      generation++;
      abort.abort();
      abort = new AbortController();
      pendingPages.clear();
      pendingChildren.clear();
    };
    const request = (parentId: unknown | null, page: number) => fetchPage(api.inputs(), api.state(), parentId, page, abort.signal);

    const loadPage = async (page: number) => {
      if (!api.inputs().fetch) return;
      const g = generation;
      api.setState({ fetching: true });
      try {
        const resp = await request(null, page);
        if (g !== generation || !api.inputs().fetch) return;
        const rows = [...(resp?.data ?? [])];
        api.setState({ fetched: rows, fetchedKey: lastKey, seededFor: null, totalRecords: total(resp?.totalRecords), fetching: false });
        announcer.announce(labels().announceLoaded(rows.length));
      } catch (error) {
        if (g === generation) api.setState({ fetching: false });
        failed(error);
      }
    };
    const loadWindowPage = async (page: number) => {
      if (!api.inputs().fetch || page <= 1) return;
      const g = generation;
      pendingPages.add(page);
      try {
        const resp = await request(null, page);
        if (g !== generation || !api.inputs().fetch) return;
        pendingPages.delete(page);
        const known = total(resp?.totalRecords);
        api.setState({
          pageCache: new Map([...api.state().pageCache, [page, [...(resp?.data ?? [])]]]),
          ...(known === null ? {} : { totalRecords: known }),
        });
      } catch (error) {
        pendingPages.delete(page);
        failed(error);
      }
    };
    const loadChildren = async (parentId: unknown) => {
      if (!api.inputs().fetch || parentId == null) return;
      const g = generation;
      pendingChildren.add(parentId);
      try {
        const resp = await request(parentId, 1);
        if (g !== generation || !api.inputs().fetch) return;
        pendingChildren.delete(parentId);
        const data = [...(resp?.data ?? [])];
        api.setState({
          childCache: new Map([...api.state().childCache, [parentId, data]]),
          childTotals: new Map([...api.state().childTotals, [parentId, resp?.totalRecords ?? data.length]]),
        });
      } catch (error) {
        pendingChildren.delete(parentId);
        failed(error);
      }
    };

    /**
     * Coalesces sort, page, page-size, filter and params changes (user actions
     * and echoed inputs alike) into one request per task; the request key skips
     * echoes, and a pending operand-typing hold defers it.
     */
    const scheduleReload = () => {
      if (!api.inputs().fetch || reloadQueued || filterHold !== null) return;
      reloadQueued = true;
      queueMicrotask(() => {
        reloadQueued = false;
        const inputs = api.inputs();
        if (!inputs.fetch || filterHold !== null) return;
        const s = api.state();
        const page = inputs.virtualScroll ? 1 : s.page;
        const key = requestKeyOf(inputs, s);
        if (key === lastKey) return;
        lastKey = key;
        invalidate();
        api.setState({ pageCache: new Map(), childCache: new Map(), childTotals: new Map() });
        void loadPage(page);
      });
    };

    /** Pull what the visible placeholders stand for: root pages ≥ 2 and children of expanded rows. */
    const fetchInView = () => {
      const inputs = api.inputs();
      if (!inputs.fetch) return;
      const m = model();
      const win = inputs.virtualScroll ? windowOf(inputs, api.state(), m.list.length) : { start: 0, end: m.list.length };
      const holes = m.list.slice(win.start, win.end).filter((r) => r.isPlaceholder);
      const cache = api.state();
      [...new Set(holes.filter((r) => r.parentId != null).map((r) => r.parentId))]
        .filter((id) => !cache.childCache.has(id) && !pendingChildren.has(id))
        .map((id) => void loadChildren(id));
      if (m.rootWindowed) {
        [...new Set(holes.filter((r) => r.parentId == null && (r.page ?? 0) > 1).map((r) => r.page!))]
          .filter((page) => !cache.pageCache.has(page) && !pendingPages.has(page))
          .map((page) => void loadWindowPage(page));
      }
    };

    // ── Selection ────────────────────────────────────────────────────────
    /** The row of every selected key, remembered so a selection survives its rows scrolling or paging away. */
    const remembered = new Map<string, unknown>();
    let anchorKey: string | null = null;
    const resolve = (ids: readonly string[]) => {
      const live = model().rowsByKey;
      return ids.map((id) => (live.has(id) ? live.get(id) : remembered.get(id)));
    };
    const commit = (keys: Iterable<string>, rows: ReadonlyArray<readonly [string, unknown]> = []) => {
      const ids = [...new Set(keys)];
      const set = new Set(ids);
      rows.filter(([key, row]) => row !== undefined && set.has(key)).map(([key, row]) => remembered.set(key, row));
      [...remembered.keys()].filter((key) => !set.has(key)).map((key) => remembered.delete(key));
      api.setState({ selectedIds: ids });
      api.emit('selectedIdsChange', ids);
      announcer.announce(labels().announceSelection(ids.length));
      api.emit('selectionChanged', { selectedIds: ids, selectedRows: resolve(ids) });
    };
    const toggleChecked = (flat: FlatRow) => {
      const inputs = api.inputs();
      const selected = new Set(api.state().selectedIds);
      const affected: [string, unknown][] = [
        [flat.key, flat.row],
        ...(inputs.tree && inputs.selectionStrategy === 'cascading'
          ? descendantsOf(model(), flat.row, api.state().childCache, inputs.idKey ?? null)
          : []),
      ];
      const keys = new Set(affected.map(([k]) => k));
      if (selected.has(flat.key)) commit([...selected].filter((k) => !keys.has(k)));
      else commit([...selected, ...keys], affected);
    };
    const selectOnClick = (flat: FlatRow, ev: Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'metaKey'>) => {
      const m = mode();
      if (m === 'none' || m === 'checkbox') return;
      if (m === 'single') {
        commit([flat.key], [[flat.key, flat.row]]);
        return;
      }
      const selected = api.state().selectedIds;
      if (ev.shiftKey && anchorKey && anchorKey !== flat.key) {
        // Over the whole list, not the rendered window: an anchor scrolled away still anchors.
        const list = model().list;
        const from = list.findIndex((r) => !r.isPlaceholder && r.key === anchorKey);
        const to = list.findIndex((r) => r.key === flat.key);
        if (from >= 0 && to >= 0) {
          const span = list.slice(Math.min(from, to), Math.max(from, to) + 1);
          // Unloaded rows inside: refuse rather than select a range with holes that looks whole.
          if (span.some((r) => r.isPlaceholder)) {
            announcer.announce(labels().rangeIncomplete);
            return;
          }
          commit([...selected, ...span.map((r) => r.key)], span.map((r) => [r.key, r.row] as const));
          return;
        }
      }
      anchorKey = flat.key;
      if (ev.ctrlKey || ev.metaKey) {
        commit(selected.includes(flat.key) ? selected.filter((k) => k !== flat.key) : [...selected, flat.key], [[flat.key, flat.row]]);
        return;
      }
      commit([flat.key], [[flat.key, flat.row]]);
    };
    const detail = (flat: FlatRow, index: number, originalEvent: Event): RowEventDetail => ({
      row: flat.row,
      rowIndex: rowIndexOf(index),
      rowKey: flat.key,
      originalEvent,
    });

    // ── Sort, paging ─────────────────────────────────────────────────────
    // A user change to a two-way input is reported through its `<name>Change`
    // output too: React is controlled and learns of it only that way.
    const resetPageTo1 = () => {
      if (api.state().page === 1) return;
      api.setState({ page: 1 });
      api.emit('pageChange', 1);
    };
    const sortBy = (name: string, shift: boolean) => {
      const next = computeNextSort(api.state().sortColumns, name, shift);
      api.setState({ sortColumns: next });
      api.emit('sortColumnsChange', next);
      resetPageTo1();
      const column = columns().find((c) => c.name === name);
      const mine = next.find((s) => s.property === name);
      announcer.announce(labels().announceSorted(column ? columnLabel(column) : name, mine ? mine.direction : 'none'));
      scheduleReload();
    };
    const gotoPage = (page: number) => {
      const pages = model().totalPages;
      const next = Math.max(1, Math.min(pages, Math.floor(page)));
      api.setState({ page: next });
      api.emit('pageChange', next);
      announcer.announce(labels().announcePage(next, pages));
      scheduleReload();
    };
    const setPerPage = (value: number) => {
      const next = positive(value, api.state().perPage);
      if (next === api.state().perPage) return;
      api.setState({ perPage: next });
      api.emit('perPageChange', next);
      resetPageTo1();
      scheduleReload();
    };

    // ── Tree ─────────────────────────────────────────────────────────────
    const toggleExpand = (flat: FlatRow) => {
      const inputs = api.inputs();
      const id = rowId(flat.row, inputs.idKey ?? null);
      if (id == null) return;
      const expanded = api.state().expandedIds;
      const opening = !expanded.includes(id);
      const expandedIds = opening ? [...expanded, id] : expanded.filter((x) => x !== id);
      api.setState({ expandedIds });
      api.emit('expandedIdsChange', expandedIds);
      const info = { row: flat.row, depth: flat.depth, parentId: flat.parentId };
      if (opening) {
        api.emit('rowExpand', info);
        if (flat.childCount > 0 && !api.state().childCache.has(id) && !pendingChildren.has(id)) void loadChildren(id);
      } else {
        api.emit('rowCollapse', info);
      }
    };

    // ── Column widths ────────────────────────────────────────────────────
    /** Widths the measure pass chose, for Reset and the re-fit. */
    let measuredWidths = new Map<string, number>();
    /** Columns the user sized: never re-fitted. */
    const userWidths = new Set<string>();
    let frozenWidths = new Map<string, number>();
    let frozenExtra: number | null = null;
    /** Whether the natural widths fitted the scroller when measured; only those are re-fitted. */
    let measuredFit = false;
    const widthOf = (name: string) => api.state().columnWidths[name] ?? headerCell(name)?.getBoundingClientRect().width ?? 100;
    const tableWidthFor = (widths: Readonly<Record<string, number>>) =>
      frozenExtra === null ? null : columns().reduce((sum, c) => sum + (widths[c.name] ?? 0), 0) + frozenExtra;

    /**
     * Pins every column at its natural width once the first real rows render,
     * then switches the table to fixed layout, so later rows clip with an
     * ellipsis instead of growing their column. FLOOR, never ceil: rounding up
     * overflows a fitting table by a pixel per column (#426).
     */
    const measureOnce = () => {
      if (api.state().measured || !columns().length) return;
      if (!host.querySelector('tbody tr[data-row-key]:not([data-placeholder="true"])')) return;
      const widths = Object.fromEntries(
        columns()
          .map((c) => [c.name, typeof c.width === 'number' ? c.width : Math.floor(headerCell(c.name)?.getBoundingClientRect().width ?? 0)] as const)
          .filter(([, w]) => w > 0),
      );
      if (!Object.keys(widths).length) return;
      measuredWidths = new Map(
        Object.entries(widths).filter(([name]) => typeof columns().find((c) => c.name === name)?.width !== 'number'),
      );
      const natural = [...host.querySelectorAll<HTMLElement>('thead tr:first-child th')].reduce((s, th) => s + th.getBoundingClientRect().width, 0);
      const box = scroller();
      measuredFit = !!box && natural <= box.clientWidth + 0.5;
      api.setState({ columnWidths: { ...widths, ...api.state().columnWidths }, measured: true });
    };

    /** Keeps fitting columns fitting when the scroller narrows; only measured widths move, never below MIN_REFIT_SCALE. */
    const refit = () => {
      const box = scroller();
      if (frozenExtra !== null || !measuredFit || !box) return;
      const scaled = [...measuredWidths].filter(([name]) => !userWidths.has(name));
      if (!scaled.length) return;
      const names = new Set(scaled.map(([n]) => n));
      const fixed = [...host.querySelectorAll<HTMLElement>('thead tr:first-child th')]
        .filter((th) => !names.has(th.dataset['column'] ?? ''))
        .reduce((s, th) => s + th.getBoundingClientRect().width, 0);
      const base = scaled.reduce((s, [, w]) => s + w, 0);
      const k = Math.min(1, Math.max(MIN_REFIT_SCALE, (box.clientWidth - fixed) / base));
      const fitted = Object.fromEntries(scaled.map(([name, w]) => [name, Math.max(MIN_COLUMN_WIDTH, Math.floor(w * k))]));
      const current = api.state().columnWidths;
      if (Object.entries(fitted).every(([name, w]) => current[name] === w)) return;
      api.setState({ columnWidths: { ...current, ...fitted } });
    };

    /**
     * Before the first user resize, pins every column at the width it renders
     * and gives the table that total, so the dragged edge tracks the pointer
     * 1:1 instead of fixed layout sharing the slack out over every column.
     */
    const freeze = () => {
      if (frozenExtra !== null) return;
      const table = host.querySelector('table');
      const rendered = columns()
        .map((c) => [c.name, headerCell(c.name)?.getBoundingClientRect().width ?? 0] as const)
        .filter(([, w]) => w > 0);
      if (!table || !rendered.length) return;
      frozenExtra = Math.max(0, table.getBoundingClientRect().width - rendered.reduce((s, [, w]) => s + w, 0));
      frozenWidths = new Map(rendered);
      api.setState({ columnWidths: { ...api.state().columnWidths, ...Object.fromEntries(rendered) } });
    };
    const setUserWidth = (name: string, width: number) => {
      freeze();
      userWidths.add(name);
      const widths = { ...api.state().columnWidths, [name]: width };
      api.setState({ columnWidths: widths, tableWidth: tableWidthFor(widths), ...(api.state().resizeColumn === name ? { resizeWidth: width } : {}) });
    };
    const step = (name: string, delta: number) => {
      freeze();
      setUserWidth(name, resizedColumnWidth(widthOf(name), delta));
    };
    /** Sizes a column to its widest rendered content, read with a Range so clipping does not hide it. */
    const fitWidth = (name: string) => {
      const range = (el: Element) => {
        if (typeof document.createRange !== 'function') return NaN;
        const r = document.createRange();
        r.selectNodeContents(el);
        return typeof r.getBoundingClientRect === 'function' ? r.getBoundingClientRect().width : NaN;
      };
      const padding = (el: Element) => {
        const s = getComputedStyle(el);
        return (parseFloat(s.paddingLeft) || 0) + (parseFloat(s.paddingRight) || 0);
      };
      const th = headerCell(name);
      const box = th?.querySelector('.header-cell');
      const text = box?.querySelector('.header-text');
      const widths = [
        th && box && text ? range(text) + padding(box) + padding(th) : NaN,
        ...withAttr('tbody tr[data-row-key] > td[data-column]', 'data-column', name).map((td) => range(td) + padding(td)),
      ];
      const fitted = fittedColumnWidth(widths);
      if (fitted != null) setUserWidth(name, fitted);
    };
    const resetWidth = (name: string) => {
      userWidths.delete(name);
      const column = columns().find((c) => c.name === name);
      if (!userWidths.size) {
        // The last user width is gone: back to the table filling its container.
        frozenExtra = null;
        frozenWidths = new Map();
        const widths = Object.fromEntries(
          columns()
            .map((c) => [c.name, measuredWidths.get(c.name) ?? c.width] as const)
            .filter((e): e is readonly [string, number] => typeof e[1] === 'number'),
        );
        api.setState({ columnWidths: widths, tableWidth: null, resizeWidth: widths[name] ?? widthOf(name) });
        requestAnimationFrame(refit);
        return;
      }
      const initial = frozenWidths.get(name) ?? measuredWidths.get(name) ?? column?.width;
      const { [name]: _dropped, ...rest } = api.state().columnWidths;
      const widths = typeof initial === 'number' ? { ...rest, [name]: initial } : rest;
      api.setState({ columnWidths: widths, tableWidth: tableWidthFor(widths), resizeWidth: initial ?? widthOf(name) });
    };
    const panel = () => host.querySelector<HTMLElement>('.resize-panel');
    const handleOf = (name: string) => headerCell(name)?.querySelector<HTMLElement>('.resize-handle') ?? null;
    const openResize = (name: string) => {
      handleOf(name)?.focus({ preventScroll: true });
      api.setState({ resizeColumn: name, resizeWidth: widthOf(name) });
      panel()?.showPopover?.();
    };
    // ── Filters ──────────────────────────────────────────────────────────
    // The table owns the panel and the `filters` model, never the filtering
    // (#448): `fetch` applies them server-side, or the consumer filters `data`.
    const distinctsRequest = new SupersedingRequest({ debounceMs: FILTER_SEARCH_DEBOUNCE_MS });
    const columnOf = (name: string) => columns().find((c) => c.name === name);
    const selectionOf = (name: string): FilterSelection => selectionsOf(api.inputs(), api.state())[name] ?? EMPTY_SELECTION;
    /** Commits a new model: page 1, then a reload now, or once operand typing pauses. */
    const setFilters = (next: DatatableFilters, typed: boolean) => {
      if (filterHold !== null) clearTimeout(filterHold);
      filterHold = typed
        ? setTimeout(() => {
            filterHold = null;
            scheduleReload();
          }, FILTER_OPERAND_DEBOUNCE_MS)
        : null;
      const current = api.state().filters;
      if (canonicalJson(next, 'filters') !== canonicalJson(current, 'filters')) {
        api.setState({ filters: next });
        api.emit('filtersChange', next);
        resetPageTo1();
      }
      scheduleReload();
    };
    const nameOf = (name: string) => {
      const column = columnOf(name);
      return column ? columnLabel(column) : name;
    };
    const filterPanelOf = (name: string): HTMLElement | null => withAttr('[data-dt-filter-panel]', 'data-dt-filter-panel', name)[0] ?? null;
    /** A list built from a window onto a larger set would silently omit values, so only a table holding every row answers locally. */
    const localList = (name: string): DistinctValues | null =>
      !api.inputs().fetch && !model().externallyPaged && api.state().childCache.size === 0
        ? localDistincts(api.inputs().data ?? [], name, labels())
        : null;
    /** Asks `distincts` first; a source resolving null cannot answer for this column, and the local list takes over. */
    const loadDistincts = async (name: string, term: string, debounced: boolean) => {
      const source = api.inputs().distincts;
      if (source) {
        api.setState({ filterLoading: true });
        // Faceted: over the other columns' filters, never the column's own.
        const filters = requestFilters(withFilter(api.state().filters, name, null));
        const params = api.inputs().fetchParams ?? undefined;
        // Wrapped, so a null answer stays distinguishable from a rejection (also a null value).
        const result = await distinctsRequest.run(
          async ({ signal }) => ({ response: await source({ column: name, search: term, filters, params, signal }) }),
          { debounceMs: debounced ? undefined : 0 },
        );
        if (result.aborted || api.state().filterColumn !== name) return;
        if (result.value === null || result.value.response) {
          api.setState({ filterLoading: false, filterLoaded: result.value?.response ?? null, filterLoadedTerm: term, filterFromLocal: false });
          return;
        }
      }
      api.setState({ filterLoading: false, filterLoaded: localList(name), filterLoadedTerm: '', filterFromLocal: true });
    };
    const applyFilter = (name: string, values: DistinctValue[], inverse: boolean) => {
      const s = api.state();
      const previous = selectionOf(name);
      const { [name]: _dropped, ...unsnapped } = s.filterSnapshots;
      // Snapshot the list when the selection first becomes non-empty, so it cannot collapse to the selection.
      const snapshot =
        values.length === 0
          ? null
          : (s.filterSnapshots[name] ??
            (previous.values.length === 0 && s.filterColumn === name && s.filterLoaded ? [...s.filterLoaded.matching, ...s.filterLoaded.remaining] : null));
      const next = activeFilter({ values, inverse }, 'values');
      api.setState({
        filterDrafts: withEntry(s.filterDrafts, name, next ? null : { inverse }),
        filterValueLabels: withEntry(s.filterValueLabels, name, values.length ? [...values] : null),
        filterSnapshots: snapshot ? { ...unsnapped, [name]: snapshot } : unsnapped,
      });
      announcer.announce(labels().announceFilter(nameOf(name), values.length));
      setFilters(withFilter(s.filters, name, next), false);
    };
    /** `typed`: from the operand box, keystroke by keystroke, so the reload waits for a pause. */
    const compareFilter = (name: string, operator: FilterOperator, raw: string, typed = false) => {
      const s = api.state();
      const operand = parseOperand(raw, columnOf(name)?.filterInputType);
      const next = activeFilter({ values: [], inverse: false, operator, operand }, 'comparison');
      api.setState({
        // The raw text is echoed back: a number input's "-" or "1e" parses to nothing mid-typing.
        filterOperandTexts: { ...s.filterOperandTexts, [name]: raw },
        filterDrafts: withEntry(s.filterDrafts, name, next ? null : { operator }),
      });
      const l = labels();
      announcer.announce(l.announceComparisonFilter(nameOf(name), l.filterOperatorLabel(operator), operand == null ? '' : String(operand)));
      setFilters(withFilter(s.filters, name, next), typed);
    };
    /** Clears in the column's own mode: a comparison column never reports a values filter. */
    const clearFilter = (name: string) => {
      const column = columnOf(name);
      if ((column?.filterMode ?? 'values') === 'comparison') {
        compareFilter(name, selectionOf(name).operator ?? column?.filterOperators?.[0] ?? 'eq', '');
      } else {
        applyFilter(name, [], false);
      }
    };
    const searchFilter = (name: string, term: string) => {
      api.setState({ filterTerm: term });
      const s = api.state();
      // Re-query only when the loaded list cannot answer: it was truncated, or the term is not a refinement.
      if (api.inputs().distincts && (s.filterLoaded?.hasMore || !term.startsWith(s.filterLoadedTerm ?? ''))) {
        void loadDistincts(name, term, true);
      }
    };
    const closeFilter = () => {
      const open = api.state().filterColumn;
      if (open !== null) filterPanelOf(open)?.hidePopover?.();
    };
    let focusFilter: string | null = null;
    const focusFilterPanel = () => {
      const panel = focusFilter === null ? null : filterPanelOf(focusFilter);
      const body = panel?.querySelector('.filter-panel-body');
      if (!panel || !body?.firstElementChild) return;
      focusFilter = null;
      panel
        .querySelector<HTMLElement>('.filter-search, .filter-operand, input, select, textarea, button:not([disabled]), [tabindex]')
        ?.focus({ preventScroll: true });
    };
    const onToggle = (ev: Event) => {
      const panel = ev.target as HTMLElement;
      const name = panel.dataset?.['dtFilterPanel'];
      if (name === undefined) return;
      distinctsRequest.cancel();
      if ((ev as ToggleEvent).newState === 'open') {
        // Loaded per open, never cached: the rows behind a list can change while it is closed.
        api.setState({ filterColumn: name, filterTerm: '', filterLoaded: null, filterLoadedTerm: null, filterLoading: false, filterFromLocal: false });
        if ((columnOf(name)?.filterMode ?? 'values') !== 'comparison') void loadDistincts(name, '', false);
        focusFilter = name;
        schedule();
      } else if (api.state().filterColumn === name) {
        // The search term is panel state: a reopened panel lists everything again, selection intact.
        api.setState({ filterColumn: null, filterTerm: '', filterLoading: false });
      }
    };
    const filterCommands: DatatableFilterCommands = {
      search: searchFilter,
      apply: applyFilter,
      compare: compareFilter,
      clear: clearFilter,
      close: closeFilter,
    };
    const instanceId = host.getAttribute('data-dt-id');
    if (instanceId) filterRegistry.set(instanceId, filterCommands);
    const panelColumn = (target: Element) => target.closest<HTMLElement>('[data-dt-filter-panel]')?.dataset['dtFilterPanel'] ?? null;
    const operandOf = (panel: Element | null) => panel?.querySelector<HTMLInputElement>('[data-dt-filter-operand]')?.value ?? '';
    const operatorOf = (panel: Element | null, name: string) =>
      (panel?.querySelector<HTMLSelectElement>('[data-dt-filter-operator]')?.value as FilterOperator | undefined) ?? selectionOf(name).operator ?? 'eq';
    const onInput = (ev: Event) => {
      const target = ev.target as HTMLInputElement;
      const name = panelColumn(target);
      if (name === null) return;
      if (target.matches('[data-dt-filter-search]')) searchFilter(name, target.value);
      else if (target.matches('[data-dt-filter-operand]')) compareFilter(name, operatorOf(filterPanelOf(name), name), target.value, true);
    };
    const onChange = (ev: Event) => {
      const target = ev.target as HTMLInputElement;
      const name = panelColumn(target);
      if (name === null) return;
      if (target.matches('[data-dt-filter-operator]')) {
        compareFilter(name, target.value as FilterOperator, operandOf(filterPanelOf(name)));
        return;
      }
      if (!target.matches('[data-dt-filter-value]')) return;
      const s = api.state();
      const selection = selectionOf(name);
      const value = filterOptionsOf(selection, bucketDistincts(s.filterLoaded, s.filterSnapshots[name] ?? null, s.filterTerm))[Number(target.dataset['dtFilterValue'])];
      if (!value) return;
      applyFilter(
        name,
        target.checked ? [...selection.values, value] : selection.values.filter((v) => !sameValue(v.value, value.value)),
        selection.inverse,
      );
    };

    let hintSpoken = false;
    let drag:{ name: string; pointerId: number; startX: number; startWidth: number; handle: HTMLElement; dragging: boolean } | null = null;

    // ── After every render ───────────────────────────────────────────────
    let frame = 0;
    const afterRender = () => {
      frame = 0;
      measureOnce();
      // A focusable separator requires aria-valuenow: backfill from the header's real width.
      [...host.querySelectorAll<HTMLElement>('.resize-handle:not([aria-valuenow])')].map((h) => {
        const th = h.closest('th');
        if (th) h.setAttribute('aria-valuenow', String(Math.round(th.getBoundingClientRect().width)));
      });
      // The sticky filter row sits below row 1, whose height varies per engine (36px, 33px in WebKit).
      if (host.querySelector('tr.filter-row')) {
        const height = Math.round(host.querySelector('thead tr:first-child th')?.getBoundingClientRect().height ?? 0);
        if (height > 0 && height !== api.state().headerHeight) api.setState({ headerHeight: height });
      }
      focusFilterPanel();
      fetchInView();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(afterRender);
    };
    const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(schedule);
    observer?.observe(host, { childList: true, subtree: true });

    let untrackScroll: (() => void) | null = null;
    let tracked: HTMLElement | null = null;
    const bindScroller = () => {
      const next = scroller();
      if (next === tracked) return;
      untrackScroll?.();
      untrackScroll = null;
      tracked = next;
      if (!next) return;
      untrackScroll = trackScroll(next, (scrollTop, viewport) => {
        const inputs = api.inputs();
        const s = api.state();
        if (inputs.virtualScroll) {
          const total = model().list.length;
          const before = windowOf(inputs, s, total);
          const after = virtualWindow({ scrollTop, viewport: viewport || SSR_VIEWPORT, itemSize: inputs.itemSize, total, buffer: inputs.virtualBuffer });
          if (!sameWindow(before, after) || viewport !== s.viewport) api.setState({ scrollTop, viewport });
        }
        refit();
        fetchInView();
      });
    };

    // ── DOM events ───────────────────────────────────────────────────────
    const rowOf = (target: Element) => {
      const tr = target.closest<HTMLElement>('tbody > tr[data-row-key]');
      if (!tr || !host.contains(tr)) return null;
      const entry = entryOf(tr.dataset['rowKey'] ?? '');
      return entry ? { ...entry, tr } : null;
    };
    const plainOrButton = (el: Element, ev: MouseEvent) => el.tagName !== 'A' || isPlainClick(ev);

    const onClick = (ev: MouseEvent) => {
      const target = ev.target as Element;
      const filtered = panelColumn(target);
      if (filtered !== null) {
        if (target.closest('[data-dt-filter-clear]')) {
          clearFilter(filtered);
          // React only seeds the operand (defaultValue): empty the box itself.
          const operand = filterPanelOf(filtered)?.querySelector<HTMLInputElement>('[data-dt-filter-operand]');
          if (operand) operand.value = '';
          // Clear disables itself: send focus where the next action starts, not to <body>.
          focusFilter = filtered;
          schedule();
        } else if (target.closest('[data-dt-filter-invert]')) {
          const selection = selectionOf(filtered);
          applyFilter(filtered, selection.values, !selection.inverse);
        }
        return;
      }
      if (target.closest('[data-dt-filter]')) return;
      const sort = target.closest<HTMLElement>('[data-dt-sort]');
      if (sort) {
        if (!plainOrButton(sort, ev) && !ev.shiftKey) return;
        ev.preventDefault();
        sortBy(sort.dataset['dtSort']!, ev.shiftKey);
        return;
      }
      const page = target.closest<HTMLElement>('[data-dt-page], [data-dt-per-page]');
      if (page) {
        if (!plainOrButton(page, ev)) return;
        ev.preventDefault();
        if (page.hasAttribute('data-dt-per-page')) setPerPage(Number(page.dataset['dtPerPage']));
        else gotoPage(Number(page.dataset['dtPage']));
        return;
      }
      if (target.closest('[data-dt-deselect-all]')) {
        // The box's checked and indeterminate state is the selection's: keep the browser from toggling it.
        ev.preventDefault();
        if (api.state().selectedIds.length) commit([]);
        return;
      }
      const stepper = target.closest<HTMLElement>('[data-dt-step]');
      const resizing = api.state().resizeColumn;
      if (stepper && resizing) {
        step(resizing, Number(stepper.dataset['dtStep']) * KEYBOARD_RESIZE_STEP);
        return;
      }
      if (target.closest('[data-dt-fit]') && resizing) return fitWidth(resizing);
      if (target.closest('[data-dt-reset]') && resizing) return resetWidth(resizing);
      if (target.closest('.resize-handle, .resize-panel')) return;

      const hit = rowOf(target);
      if (!hit) return;
      if (target.closest('[data-dt-toggle]')) {
        ev.preventDefault();
        toggleExpand(hit.flat);
        return;
      }
      // The checkbox cell only selects: its clicks never open the row.
      const cell = target.closest('[data-dt-check-cell]');
      if (cell) {
        ev.preventDefault();
        if (target.closest('[data-dt-check]') || mode() === 'checkbox') toggleChecked(hit.flat);
        return;
      }
      api.setState({ focusedKey: hit.flat.key });
      selectOnClick(hit.flat, ev);
      api.emit('rowClick', detail(hit.flat, hit.index, ev));
    };

    const onDblClick = (ev: MouseEvent) => {
      const target = ev.target as Element;
      if (target.closest('[data-dt-check-cell], [data-dt-toggle]')) return;
      const hit = rowOf(target);
      if (hit) api.emit('rowDblClick', detail(hit.flat, hit.index, ev));
    };

    const onContextMenu = (ev: MouseEvent) => {
      const hit = rowOf(ev.target as Element);
      if (!hit) return;
      // A right-clicked row joins the selection first (file-manager convention); not in checkbox mode.
      const m = mode();
      if (m !== 'none' && m !== 'checkbox' && !api.state().selectedIds.includes(hit.flat.key)) {
        api.setState({ focusedKey: hit.flat.key });
        commit([hit.flat.key], [[hit.flat.key, hit.flat.row]]);
      }
      api.emit('rowContextMenu', detail(hit.flat, hit.index, ev));
    };

    const onFocusIn = (ev: FocusEvent) => {
      const target = ev.target as Element;
      if (target.matches?.('.resize-handle') && !hintSpoken) {
        hintSpoken = true;
        announcer.announce(labels().resizeColumnHint);
      }
      const hit = target.matches?.('tbody > tr[data-row-key]') ? rowOf(target) : null;
      if (hit && api.state().focusedKey !== hit.flat.key) api.setState({ focusedKey: hit.flat.key });
    };

    /**
     * One keymap for every row: ArrowUp/Down move, ArrowRight/Left expand and
     * collapse a tree row, Enter opens (row click), Space selects. In checkbox
     * mode Space is the checkbox and Enter only the row click.
     */
    const onKeydown = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement;
      const handle = target.closest<HTMLElement>('.resize-handle');
      if (handle) {
        const name = handle.dataset['dtResize']!;
        if (ev.key === 'Enter') {
          ev.preventDefault();
          openResize(name);
        } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
          ev.preventDefault();
          step(name, ev.key === 'ArrowRight' ? KEYBOARD_RESIZE_STEP : -KEYBOARD_RESIZE_STEP);
        }
        return;
      }
      // Keys from a control inside the row operate that control, not the row.
      if (ev.altKey || !target.matches?.('tbody > tr[data-row-key]')) return;
      const hit = rowOf(target);
      if (!hit) return;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        const rows = [...host.querySelectorAll<HTMLElement>('tbody > tr[data-row-key]:not([data-placeholder="true"])')];
        rows[rows.indexOf(hit.tr) + (ev.key === 'ArrowDown' ? 1 : -1)]?.focus();
        return;
      }
      if (api.inputs().tree) {
        if ((ev.key === 'ArrowRight' && hit.flat.childCount > 0 && !hit.flat.isExpanded) || (ev.key === 'ArrowLeft' && hit.flat.isExpanded)) {
          ev.preventDefault();
          toggleExpand(hit.flat);
          return;
        }
      }
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const m = mode();
      if (m === 'checkbox') {
        ev.preventDefault();
        api.setState({ focusedKey: hit.flat.key });
        if (ev.key === ' ') {
          if (!ev.shiftKey) toggleChecked(hit.flat);
          return;
        }
        api.emit('rowClick', detail(hit.flat, hit.index, ev));
        return;
      }
      if (m === 'none') return;
      ev.preventDefault();
      api.setState({ focusedKey: hit.flat.key });
      selectOnClick(hit.flat, ev);
      api.emit('rowClick', detail(hit.flat, hit.index, ev));
    };

    /**
     * A press on a handle is a drag once it moves past RESIZE_TAP_SLOP; a tap
     * opens the options, the single-pointer alternative WCAG 2.5.7 requires.
     */
    const onPointerDown = (ev: PointerEvent) => {
      const handle = (ev.target as Element).closest<HTMLElement>('.resize-handle');
      if (!handle || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
      const th = handle.closest('th');
      if (!th) return;
      ev.preventDefault();
      drag = { name: handle.dataset['dtResize']!, pointerId: ev.pointerId, startX: ev.clientX, startWidth: th.getBoundingClientRect().width, handle, dragging: false };
      handle.classList.add('active');
      handle.setPointerCapture?.(ev.pointerId);
    };
    const onPointerMove = (ev: PointerEvent) => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      const delta = ev.clientX - drag.startX;
      if (!drag.dragging && Math.abs(delta) <= RESIZE_TAP_SLOP) return;
      drag.dragging = true;
      setUserWidth(drag.name, resizedColumnWidth(drag.startWidth, delta));
    };
    const onPointerEnd = (ev: PointerEvent) => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      const ended = drag;
      drag = null;
      ended.handle.classList.remove('active');
      try {
        ended.handle.releasePointerCapture?.(ev.pointerId);
      } catch {
        /* already released */
      }
      if (ev.type === 'pointerup' && !ended.dragging) openResize(ended.name);
    };

    const listeners: [string, EventListener][] = [
      ['click', onClick as EventListener],
      ['dblclick', onDblClick as EventListener],
      ['contextmenu', onContextMenu as EventListener],
      ['focusin', onFocusIn as EventListener],
      ['keydown', onKeydown as EventListener],
      ['pointerdown', onPointerDown as EventListener],
      ['pointermove', onPointerMove as EventListener],
      ['pointerup', onPointerEnd as EventListener],
      ['pointercancel', onPointerEnd as EventListener],
      ['input', onInput],
      ['change', onChange],
    ];
    listeners.map(([type, fn]) => host.addEventListener(type, fn));
    // toggle does not bubble.
    host.addEventListener('toggle', onToggle, true);
    const untrackPopovers = trackPopovers(host, (panel) => {
      const filterColumn = panel.dataset['dtFilterPanel'];
      if (filterColumn !== undefined) return panel.parentElement?.querySelector<HTMLElement>('[data-dt-filter]') ?? null;
      return api.state().resizeColumn ? handleOf(api.state().resizeColumn!) : null;
    });

    bindScroller();
    schedule();
    scheduleReload();

    controllers.set(host, {
      reload: ({ resetPage = false } = {}) => {
        if (resetPage) resetPageTo1();
        // Forgetting the last key is what makes this reload not look like an echo.
        lastKey = null;
        scheduleReload();
      },
      inputsChanged: (prev) => {
        const inputs = api.inputs();
        const s = api.state();
        if (inputs.fetch !== prev.fetch) {
          if (inputs.fetch && s.seededFor === inputs.fetch && s.fetchedKey === requestKeyOf(inputs, s)) {
            // The late fetch the bridge adopted the server's seed for: page 1 is its answer, once.
            // Any other fetch identity is a new source and reloads.
            lastKey = s.fetchedKey;
            api.setState({ seededFor: null });
          } else {
            // A new source: its count, pages and children are all unknown.
            invalidate();
            lastKey = null;
            api.setState({ fetched: null, fetchedKey: null, seededFor: null, totalRecords: null, pageCache: new Map(), childCache: new Map(), childTotals: new Map(), fetching: !!inputs.fetch });
          }
        }
        if (inputs.sortColumns !== prev.sortColumns && !sameSort(inputs.sortColumns ?? [], s.sortColumns)) {
          api.setState({ sortColumns: [...(inputs.sortColumns ?? [])] });
        }
        if (inputs.perPage !== prev.perPage && positive(inputs.perPage, 20) !== s.perPage) {
          api.setState({ perPage: positive(inputs.perPage, 20), page: inputs.page !== prev.page ? positive(inputs.page, 1) : 1 });
        } else if (inputs.page !== prev.page && positive(inputs.page, 1) !== s.page) {
          api.setState({ page: positive(inputs.page, 1) });
        }
        if (inputs.selectedIds !== prev.selectedIds && inputs.selectedIds !== s.selectedIds) {
          api.setState({ selectedIds: [...(inputs.selectedIds ?? [])] });
        }
        if (inputs.expandedIds !== prev.expandedIds && inputs.expandedIds !== s.expandedIds) {
          api.setState({ expandedIds: [...(inputs.expandedIds ?? [])] });
        }
        if (inputs.focusedRowKey !== prev.focusedRowKey) api.setState({ focusedKey: inputs.focusedRowKey ?? null });
        if (parseSelectionMode(inputs.selectionMode) === 'none' && parseSelectionMode(prev.selectionMode) !== 'none') {
          anchorKey = null;
          if (api.state().selectedIds.length) commit([]);
        }
        if (inputs.columns !== prev.columns) {
          measuredWidths = new Map();
          userWidths.clear();
          frozenExtra = null;
          // The filters are the model's and survive; panel leftovers of the old columns do not.
          api.setState({ columnWidths: {}, measured: false, tableWidth: null, filterDrafts: {}, filterSnapshots: {}, filterOperandTexts: {} });
        }
        if (inputs.filters !== prev.filters) {
          const next = requestFilters(inputs.filters);
          // Compared canonically: an echo of our own filtersChange is a new object with the same filters.
          if (canonicalJson(next, 'filters') !== canonicalJson(api.state().filters, 'filters')) {
            // Set from outside: the typed operand texts no longer describe it.
            api.setState({ filters: next, filterOperandTexts: {} });
          }
        }
        // A locally derived list follows the rows under it, or no value would ever move to "remaining".
        const open = api.state().filterColumn;
        if (inputs.data !== prev.data && open !== null && api.state().filterFromLocal) {
          api.setState({ filterLoaded: localList(open) });
        }
        if (inputs.fill !== prev.fill) requestAnimationFrame(bindScroller);
        scheduleReload();
        schedule();
      },
    });

    return () => {
      controllers.delete(host);
      listeners.map(([type, fn]) => host.removeEventListener(type, fn));
      host.removeEventListener('toggle', onToggle, true);
      if (instanceId && filterRegistry.get(instanceId) === filterCommands) filterRegistry.delete(instanceId);
      distinctsRequest.dispose();
      if (filterHold !== null) clearTimeout(filterHold);
      untrackPopovers();
      untrackScroll?.();
      observer?.disconnect();
      cancelAnimationFrame(frame);
      invalidate();
      unsubscribe();
      announcer.destroy();
    };
  },
  inputsChanged: (api, prev) => controllers.get(api.host)?.inputsChanged(prev),
  methods: {
    reload: (api, options) => controllers.get(api.host)?.reload(options),
  },
});
