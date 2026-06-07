import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { datatableStyles } from '../styles';
import { computeNextSort, sortRows, type SortColumn } from '../sort';
import type {
  CellContent,
  DatatableColumnDef,
  HeaderRenderer,
  RowKey,
  RowRenderer,
  RowRenderContext,
  TreeFetchRequestDetail,
  TreeFetchResponse,
  TreeRowExpandDetail,
  TreeExpandedIdsChangeDetail,
  TreeIdKey,
  TreeSelectionStrategy,
} from '../types';

// Side-effect import: registers <mp-pagination> for the footer.
import '@mintplayer/web-components/pagination';
import type { PageChangeEventDetail } from '@mintplayer/web-components/pagination';

// Side-effect import: registers <mp-checkbox> for selection columns.
import '@mintplayer/web-components/checkbox';

export type DatatableSelectionMode = 'none' | 'single' | 'multiple';

export interface RowEventDetail<T = unknown> {
  row: T;
  rowIndex: number;
  rowKey: string;
  originalEvent: Event;
}

export interface SortChangeEventDetail {
  sortColumns: SortColumn[];
}

export interface SelectionChangeEventDetail {
  selectedIds: string[];
}

/**
 * One entry in the flattened visible-row list. In flat mode every entry has
 * `depth: 0`, `isExpanded: false`, `isPlaceholder: false`, `parentId: null`.
 * In tree mode children of expanded rows are inlined as siblings with
 * `depth > 0`; not-yet-loaded children appear as placeholder entries with
 * `row: undefined` so the viewport can reserve vertical space for them.
 *
 * In root-windowed mode (`isRootWindowed()`) unloaded **root** slots are
 * placeholders (`parentId: null`) that additionally carry `page` — the 1-based
 * root page the missing row belongs to — so the viewport scan can request that
 * page without re-deriving it. (Child placeholders carry `parentId` and no
 * `page`.)
 */
interface FlatVisibleRow {
  row: unknown | undefined;
  key: string;
  depth: number;
  parentId: unknown | null;
  isExpanded: boolean;
  isPlaceholder: boolean;
  /** Root-window placeholders only: the 1-based root page this slot belongs to. */
  page?: number;
}

let instanceCounter = 0;

/**
 * `<mp-datatable>` — property-driven data grid.
 *
 * - Columns are declared programmatically via `DatatableColumnDef[]`.
 *   Each column supplies a name (sort key) + optional `cellRenderer`.
 * - Sort algorithm extracted into the pure `computeNextSort` helper.
 * - Selection model: `'none' | 'single' | 'multiple'` with checkbox column
 *   when multi-select.
 * - Row events: `mp-datatable-row-click`, `mp-datatable-row-dblclick`,
 *   `mp-datatable-row-contextmenu` — all carry `RowEventDetail`.
 * - Pagination footer when `pagination` enabled.
 * - Column resize via a 6px handle at the right edge of each header.
 */
export class MpDatatable extends LitElement {
  static override styles = [datatableStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'selection-mode',
      'pagination',
      'resizable-columns',
      'auto-sort',
      'empty-message',
      'virtual-scroll',
      'item-size',
      'tree',
      'tree-indent',
      'selection-strategy',
    ];
  }

  private readonly instanceId = `mp-datatable-${++instanceCounter}`;

  private _columns: DatatableColumnDef[] = [];
  private _data: unknown[] = [];
  private _sortColumns: SortColumn[] = [];
  private _selectionMode: DatatableSelectionMode = 'none';
  private _selectedIds: Set<string> = new Set();
  private _cutIds: Set<string> = new Set();
  private _focusedRowKey: string | null = null;
  private _rowKey: RowKey = (row, index) => {
    const r = row as { id?: unknown } | null;
    return r && r.id != null ? String(r.id) : `row-${index}`;
  };
  private _columnWidths: Map<string, number> = new Map();
  /** Becomes `true` after the first measure-once pass locks column widths. Drives the `.measured` class on the table (→ `table-layout: fixed`). */
  private _hasMeasuredInitial = false;
  private _loading = false;
  private _emptyMessage = 'No data';
  private _pagination = false;
  private _page = 1;
  private _perPage = 20;
  private _perPageOptions: number[] = [10, 20, 50];
  private _autoSort = true;
  /** Caller-supplied total row count for external paging (`[fetch]`). When > `_data.length` the WC skips its own slice and trusts the consumer. */
  private _totalRecords: number | null = null;
  private _rowRenderer: RowRenderer | undefined;
  private _virtualScroll = false;
  private _itemSize = 40;
  private _virtualBuffer = 10;
  private _virtualRange: { startIndex: number; endIndex: number } = { startIndex: 0, endIndex: 0 };
  private _scrollElement: HTMLElement | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _scrollListener: (() => void) | null = null;
  private _viewportHeight = 0;

  // ─── Tree-mode state ─────────────────────────────────────────────────────
  private _tree = false;
  private _idKey: TreeIdKey | null = null;
  private _childCountKey: string | null = null;
  private _treeIndent = 1.25;
  private _expandedIds: Set<unknown> = new Set();
  private _selectionStrategy: TreeSelectionStrategy = 'flat';
  /** Children fetched per parentId (only first page for v1). */
  private _childCache: Map<unknown, unknown[]> = new Map();
  /** Server-reported totalRecords per parentId; missing = use childCountKey on the row. */
  private _childTotals: Map<unknown, number> = new Map();
  /** Parents with an in-flight fetch; suppresses re-requests. */
  private _pendingFetches: Set<unknown> = new Set();

  // ─── Flat virtual windowed-fetch state ──────────────────────────────────
  // Flat (non-tree) virtual + external `[fetch]` is lazy and page-keyed: page 1
  // lives in `_data` (mirroring tree roots), pages ≥ 2 are fetched on demand as
  // their rows scroll into view and stored here. Kept separate from the tree
  // caches because `parentId: null` already means "tree root" — the WC
  // disambiguates by `this._tree` being false. Cleared by `invalidateData()`.
  /** Loaded rows per 1-based page (pages ≥ 2; page 1 is `_data`). */
  private _pageCache: Map<number, unknown[]> = new Map();
  /** Pages with an in-flight fetch; suppresses re-requests. */
  private _pendingPageFetches: Set<number> = new Set();

  /** Per-render memo of `getFlatList()`. Invalidated in `willUpdate`. */
  private _cachedFlatList: FlatVisibleRow[] | null = null;
  /** Per-render memo of the set of row keys whose loaded subtree is partially selected. */
  private _cachedIndeterminateKeys: Set<string> | null = null;

  /** When true, the WC sorts `data` itself using `sortRows`. Set `false` if the consumer sorts externally. */
  get autoSort(): boolean {
    return this._autoSort;
  }
  set autoSort(value: boolean) {
    this._autoSort = !!value;
    this.requestUpdate();
  }

  /**
   * Per-row renderer. When set, the WC delegates row content production to
   * this callback (used by the Angular wrapper to host `*bsRowTemplate`
   * templates). Returning `undefined` falls back to per-column `cellRenderer`s.
   */
  get rowRenderer(): RowRenderer | undefined {
    return this._rowRenderer;
  }
  set rowRenderer(value: RowRenderer | undefined) {
    this._rowRenderer = value;
    this.requestUpdate();
  }

  /** Enable scroll-position-driven virtualization. Rows outside the viewport are not rendered. */
  get virtualScroll(): boolean {
    return this._virtualScroll;
  }
  set virtualScroll(value: boolean) {
    const next = !!value;
    if (this._virtualScroll !== next) {
      this._virtualScroll = next;
      this.requestUpdate();
    }
  }

  /** Approximate row height in px (used by virtual scroll). Default `40`. */
  get itemSize(): number {
    return this._itemSize;
  }
  set itemSize(value: number) {
    const next = Math.max(1, Math.floor(value || 0)) || 40;
    if (this._itemSize !== next) {
      this._itemSize = next;
      this.requestUpdate();
    }
  }

  /** Off-screen row buffer (each side) for virtual scrolling. */
  get virtualBuffer(): number {
    return this._virtualBuffer;
  }
  set virtualBuffer(value: number) {
    const next = Math.max(0, Math.floor(value || 0));
    if (this._virtualBuffer !== next) {
      this._virtualBuffer = next;
      this.requestUpdate();
    }
  }

  get columns(): DatatableColumnDef[] {
    return this._columns;
  }
  set columns(value: DatatableColumnDef[]) {
    this._columns = Array.isArray(value) ? value : [];
    this.requestUpdate();
  }

  get data(): unknown[] {
    return this._data;
  }
  set data(value: unknown[]) {
    this._data = Array.isArray(value) ? value : [];
    this.requestUpdate();
  }

  get sortColumns(): SortColumn[] {
    return [...this._sortColumns];
  }
  set sortColumns(value: SortColumn[]) {
    this._sortColumns = Array.isArray(value) ? [...value] : [];
    this.requestUpdate();
  }

  get selectionMode(): DatatableSelectionMode {
    return this._selectionMode;
  }
  set selectionMode(value: DatatableSelectionMode) {
    this._selectionMode = value;
    if (value === 'none') this._selectedIds.clear();
    this.requestUpdate();
  }

  get selectedIds(): string[] {
    return [...this._selectedIds];
  }
  set selectedIds(value: string[] | ReadonlyArray<string>) {
    this._selectedIds = new Set(value ?? []);
    this.requestUpdate();
  }

  get cutIds(): string[] {
    return [...this._cutIds];
  }
  set cutIds(value: string[] | ReadonlyArray<string>) {
    this._cutIds = new Set(value ?? []);
    this.requestUpdate();
  }

  get focusedRowKey(): string | null {
    return this._focusedRowKey;
  }
  set focusedRowKey(value: string | null) {
    this._focusedRowKey = value;
    this.requestUpdate();
  }

  get rowKey(): RowKey {
    return this._rowKey;
  }
  set rowKey(value: RowKey) {
    this._rowKey = typeof value === 'function' ? value : this._rowKey;
    this.requestUpdate();
  }

  // ─── Tree-mode public API ────────────────────────────────────────────────

  /** Enable tree mode (chevron column, nested expansion, lazy children). */
  get tree(): boolean {
    return this._tree;
  }
  set tree(value: boolean) {
    const next = !!value;
    if (this._tree !== next) {
      this._tree = next;
      this.requestUpdate();
    }
  }

  /**
   * Property name or function that extracts the stable row identity used as
   * the expansion key and as `parentId` in `mp-datatable-fetch-request`.
   * Required when `tree=true`.
   */
  get idKey(): TreeIdKey | null {
    return this._idKey;
  }
  set idKey(value: TreeIdKey | null) {
    this._idKey = value;
    this.requestUpdate();
  }

  /**
   * Property name on the row that holds the direct-child count. Drives both
   * chevron visibility AND placeholder reservation. Required when `tree=true`.
   */
  get childCountKey(): string | null {
    return this._childCountKey;
  }
  set childCountKey(value: string | null) {
    this._childCountKey = value || null;
    this.requestUpdate();
  }

  /** Indent in rem per depth level on the chevron cell. Default `1.25`. */
  get treeIndent(): number {
    return this._treeIndent;
  }
  set treeIndent(value: number) {
    const n = Number(value);
    this._treeIndent = Number.isFinite(n) && n >= 0 ? n : 1.25;
    this.requestUpdate();
  }

  /** Two-way binding target: set of expanded-row id values (per `idKey`). */
  get expandedIds(): Set<unknown> {
    return new Set(this._expandedIds);
  }
  set expandedIds(value: Set<unknown> | ReadonlyArray<unknown> | null | undefined) {
    if (!value) this._expandedIds = new Set();
    else if (value instanceof Set) this._expandedIds = new Set(value);
    else this._expandedIds = new Set(value);
    this.requestUpdate();
  }

  /** `'flat'` (default) or `'cascading'`. When `tree=true`, cascading is recommended. */
  get selectionStrategy(): TreeSelectionStrategy {
    return this._selectionStrategy;
  }
  set selectionStrategy(value: TreeSelectionStrategy) {
    this._selectionStrategy = value === 'cascading' ? 'cascading' : 'flat';
    this.requestUpdate();
  }

  get loading(): boolean {
    return this._loading;
  }
  set loading(value: boolean) {
    this._loading = !!value;
    this.requestUpdate();
  }

  get emptyMessage(): string {
    return this._emptyMessage;
  }
  set emptyMessage(value: string) {
    this._emptyMessage = value || 'No data';
    this.requestUpdate();
  }

  get pagination(): boolean {
    return this._pagination;
  }
  set pagination(value: boolean) {
    this._pagination = !!value;
    this.requestUpdate();
  }

  get page(): number {
    return this._page;
  }
  set page(value: number) {
    const next = Math.max(1, Math.floor(value || 1));
    if (this._page !== next) {
      this._page = next;
      this.requestUpdate();
    }
  }

  get perPage(): number {
    return this._perPage;
  }
  set perPage(value: number) {
    const next = Math.max(1, Math.floor(value || 1));
    if (this._perPage !== next) {
      this._perPage = next;
      this._page = 1;
      this.requestUpdate();
    }
  }

  get perPageOptions(): number[] {
    return [...this._perPageOptions];
  }
  set perPageOptions(value: number[]) {
    this._perPageOptions = Array.isArray(value) && value.length > 0 ? [...value] : [10, 20, 50];
    this.requestUpdate();
  }

  /**
   * Caller-supplied total record count for external paging. Set this when
   * `[fetch]` returns one page at a time so the pagination footer can show
   * the correct total. Leave as `null` (default) to use `_data.length`.
   */
  get totalRecords(): number | null {
    return this._totalRecords;
  }
  set totalRecords(value: number | null) {
    const next = value == null ? null : Math.max(0, Math.floor(value));
    if (this._totalRecords !== next) {
      this._totalRecords = next;
      this.requestUpdate();
    }
  }

  /** True when the consumer is paging externally (totalRecords exceeds the in-memory rows). */
  private isExternallyPaged(): boolean {
    return this._totalRecords != null && this._totalRecords > this._data.length;
  }

  /**
   * True when virtual scrolling is driving lazy windowed fetches at the **root**
   * level: the consumer pages externally and the WC pulls root pages ≥ 2 on
   * demand. Applies to BOTH flat mode (the rows are the roots) and tree mode
   * (the top-level rows; their children are windowed separately, keyed by
   * parentId). When false (single page or no virtual scroll) the WC falls back
   * to the trivial mapping of `_data`.
   */
  private isRootWindowed(): boolean {
    return this._virtualScroll && this.isExternallyPaged();
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'selection-mode') {
      const v = newValue;
      if (v === 'none' || v === 'single' || v === 'multiple') {
        this.selectionMode = v;
      }
    } else if (name === 'pagination') {
      this.pagination = newValue !== null;
    } else if (name === 'resizable-columns') {
      this.resizableColumns = newValue !== null;
    } else if (name === 'auto-sort') {
      this.autoSort = newValue !== 'false';
    } else if (name === 'empty-message') {
      this.emptyMessage = newValue ?? 'No data';
    } else if (name === 'virtual-scroll') {
      this.virtualScroll = newValue !== null;
    } else if (name === 'item-size') {
      const n = Number(newValue);
      if (Number.isFinite(n)) this.itemSize = n;
    } else if (name === 'tree') {
      this.tree = newValue !== null;
    } else if (name === 'tree-indent') {
      const n = Number(newValue);
      if (Number.isFinite(n)) this.treeIndent = n;
    } else if (name === 'selection-strategy') {
      this.selectionStrategy = newValue === 'cascading' ? 'cascading' : 'flat';
    }
  }

  private _resizableColumns = true;
  get resizableColumns(): boolean {
    return this._resizableColumns;
  }
  set resizableColumns(value: boolean) {
    this._resizableColumns = !!value;
    this.requestUpdate();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // `role="grid"` lives on the inner <table>, not the host. axe-core walks
    // the shadow DOM but checks `aria-required-children` against the host's
    // *direct* children — which are layout <div>s, not rows — so setting it
    // on the host would fail the rule even though the table itself is fine.
  }

  protected override firstUpdated(): void {
    this._scrollElement = this.shadowRoot?.querySelector('.datatable-scroll') as HTMLElement | null;
    if (this._scrollElement) {
      this._scrollListener = () => this.refreshVirtualRange();
      this._scrollElement.addEventListener('scroll', this._scrollListener, { passive: true });
      if (typeof ResizeObserver !== 'undefined') {
        this._resizeObserver = new ResizeObserver(() => this.refreshVirtualRange());
        this._resizeObserver.observe(this._scrollElement);
      }
    }
    this.refreshVirtualRange();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    super.willUpdate(changedProperties);
    // Invalidate per-render memos before each render. `getFlatList` is hit
    // from `computeVisibleRows`, `getVirtualSpacerHeights`, and the
    // `aria-rowcount` computation in `render()` — and re-runs sorting +
    // walks the loaded forest on every call. The indeterminate-set is hit
    // once per visible row in `renderRow`. Memoising both per render
    // collapses these to single passes regardless of how often they're
    // sampled.
    this._cachedFlatList = null;
    this._cachedIndeterminateKeys = null;
  }

  protected override updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    // Re-evaluate the visible range after every render so it stays in sync
    // with state changes that grow/shrink the flat list (data set, children
    // lazy-loaded, expandedIds toggled). Idempotent — refreshVirtualRange
    // only requestUpdates when the range actually changes, so this can't
    // loop.
    this.refreshVirtualRange();
    // Measure-once: lock per-column widths the first time a non-empty body
    // is in the DOM, then switch the table to `table-layout: fixed` so
    // later rows clip with ellipsis instead of growing the column. See the
    // unified datatable PRD's "Resizable columns" section for the design.
    this.maybeMeasureInitialColumnWidths();
  }

  /**
   * Run the auto-size-once pass after the first batch of rows lands in the
   * DOM. Columns with an explicit `col.width` are pinned to that value
   * without measurement; the rest are measured from their natural
   * (`table-layout: auto`) width via `getBoundingClientRect()` on the
   * `<th>`. Once any column gets a width, `_hasMeasuredInitial` flips and
   * the table renders with `table-layout: fixed` so the widths are
   * authoritative and overflowing content clips with ellipsis.
   */
  private maybeMeasureInitialColumnWidths(): void {
    if (this._hasMeasuredInitial) return;
    if (this._columns.length === 0 || this._data.length === 0) return;
    if (!this.shadowRoot) return;
    const bodyRows = this.shadowRoot.querySelectorAll('tbody tr[data-row-key]:not([data-placeholder="true"])');
    if (bodyRows.length === 0) return; // wait for the first real row before measuring

    const next = new Map(this._columnWidths);
    let anyAdded = false;
    for (const col of this._columns) {
      if (next.has(col.name)) continue;
      if (typeof col.width === 'number') {
        next.set(col.name, col.width);
        anyAdded = true;
        continue;
      }
      const w = this.measureColumnWidth(col.name);
      if (w != null) {
        next.set(col.name, w);
        anyAdded = true;
      }
    }

    if (anyAdded) {
      this._columnWidths = next;
      this._hasMeasuredInitial = true;
      this.requestUpdate();
    }
  }

  private measureColumnWidth(name: string): number | null {
    if (!this.shadowRoot) return null;
    const th = this.shadowRoot.querySelector(`th[data-column="${name}"]`) as HTMLElement | null;
    if (!th) return null;
    const w = Math.ceil(th.getBoundingClientRect().width);
    return w > 0 ? w : null;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._scrollElement && this._scrollListener) {
      this._scrollElement.removeEventListener('scroll', this._scrollListener);
    }
    this._scrollListener = null;
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._scrollElement = null;
  }

  private refreshVirtualRange(): void {
    if (!this._virtualScroll || !this._scrollElement) return;
    const scrollTop = this._scrollElement.scrollTop;
    const viewport = this._scrollElement.clientHeight;
    this._viewportHeight = viewport;
    const total = this.getEffectiveData().length;
    const itemSize = this._itemSize;
    const start = Math.max(0, Math.floor(scrollTop / itemSize) - this._virtualBuffer);
    const visible = Math.ceil(viewport / itemSize);
    const end = Math.min(total, start + visible + this._virtualBuffer * 2);
    if (start !== this._virtualRange.startIndex || end !== this._virtualRange.endIndex) {
      this._virtualRange = { startIndex: start, endIndex: end };
      this.requestUpdate();
    }
    // Lazily fetch data whose placeholder rows enter the viewport. Tree-mode
    // children are keyed by parentId; root-window pages (flat rows, or the
    // top level of a tree) are keyed by page. A virtual tree needs both: its
    // roots paginate AND its expanded children load on demand.
    if (this._tree) this.maybeFetchPlaceholdersInViewport();
    if (this.isRootWindowed()) this.maybeFetchPagesInViewport();
  }

  /**
   * Walk the visible viewport for placeholder rows whose parent isn't cached
   * and isn't already in-flight. Emit a fetch-request per such parent.
   */
  private maybeFetchPlaceholdersInViewport(): void {
    const list = this.getFlatList();
    const { startIndex, endIndex } = this._virtualRange;
    const lo = this._virtualScroll ? startIndex : 0;
    const hi = this._virtualScroll ? endIndex : list.length;
    const toFetch = new Set<unknown>();
    for (let i = lo; i < hi; i++) {
      const r = list[i];
      if (!r.isPlaceholder || r.parentId == null) continue;
      if (this._childCache.has(r.parentId) || this._pendingFetches.has(r.parentId)) continue;
      toFetch.add(r.parentId);
    }
    for (const parentId of toFetch) this.requestChildrenFetch(parentId);
  }

  /**
   * Flat-window counterpart of `maybeFetchPlaceholdersInViewport`: scan the
   * visible range for flat placeholder rows, collect the distinct pages they
   * belong to that aren't cached or already in-flight, and request each once.
   * Page 1 is never requested here — it lives in `_data` (seeded by the
   * wrapper's first-page fetch).
   */
  private maybeFetchPagesInViewport(): void {
    const list = this.getFlatList();
    const { startIndex, endIndex } = this._virtualRange;
    const lo = this._virtualScroll ? startIndex : 0;
    const hi = this._virtualScroll ? endIndex : list.length;
    const toFetch = new Set<number>();
    for (let i = lo; i < hi; i++) {
      const r = list[i];
      if (!r.isPlaceholder || r.page == null || r.page <= 1) continue;
      if (this._pageCache.has(r.page) || this._pendingPageFetches.has(r.page)) continue;
      toFetch.add(r.page);
    }
    for (const page of toFetch) this.requestPageFetch(page);
  }

  override render(): TemplateResult {
    const rows = this.computeVisibleRows();
    const paginationDenominator = this._totalRecords ?? this._data.length;
    const totalPages = this.pagination && !this._tree
      ? Math.max(1, Math.ceil(paginationDenominator / this._perPage))
      : 1;
    const showCheckboxes = this._selectionMode === 'multiple';
    const totalColumnCount =
      this._columns.length + (showCheckboxes ? 1 : 0) + (this._tree ? 1 : 0);

    // Virtual scroll: spacer rows at top and bottom.
    const virtualMeta = this.getVirtualSpacerHeights();
    const ariaRowcount = (this._tree || this.isRootWindowed() ? this.getFlatList().length : this._data.length) + 1;

    return html`
      <div class="datatable-shell">
        <div class="datatable-scroll ${this._virtualScroll ? 'datatable-virtual' : ''}" role="presentation">
          <table
            role=${this._tree ? 'treegrid' : 'grid'}
            aria-rowcount=${ariaRowcount}
            class=${this._hasMeasuredInitial ? 'measured' : ''}
          >
            <thead>
              <tr role="row" aria-rowindex="1">
                ${this._tree
                  ? html`<th class="tree-chevron-cell" scope="col" aria-label="Expand or collapse"></th>`
                  : nothing}
                ${showCheckboxes
                  ? html`<th class="checkbox-cell" scope="col">
                      <mp-checkbox
                        aria-label="Deselect all"
                        aria-hidden=${this._selectedIds.size === 0 ? 'true' : nothing}
                        style=${styleMap({ visibility: this._selectedIds.size > 0 ? 'visible' : 'hidden' })}
                        .checked=${false}
                        .indeterminate=${this._selectedIds.size > 0}
                        @change=${this.onDeselectAll}
                      ></mp-checkbox>
                    </th>`
                  : nothing}
                ${this._columns.map((col, idx) => this.renderHeader(col, idx))}
              </tr>
            </thead>
            <tbody>
              ${this._loading
                ? html`<tr><td colspan=${totalColumnCount} class="loading-state">Loading…</td></tr>`
                : rows.length === 0
                  ? html`<tr><td colspan=${totalColumnCount} class="empty-state">${this._emptyMessage}</td></tr>`
                  : html`
                      ${virtualMeta.top > 0
                        ? html`<tr class="virtual-spacer" aria-hidden="true"><td colspan=${totalColumnCount} style=${styleMap({ height: `${virtualMeta.top}px`, padding: '0', border: '0' })}></td></tr>`
                        : nothing}
                      ${repeat(
                        rows,
                        ({ key }) => key,
                        ({ key, rowIndex, flat }) => this.renderRow(flat, key, rowIndex, showCheckboxes),
                      )}
                      ${virtualMeta.bottom > 0
                        ? html`<tr class="virtual-spacer" aria-hidden="true"><td colspan=${totalColumnCount} style=${styleMap({ height: `${virtualMeta.bottom}px`, padding: '0', border: '0' })}></td></tr>`
                        : nothing}
                    `}
            </tbody>
          </table>
        </div>
        ${this._pagination && !this._tree ? this.renderFooter(totalPages) : nothing}
      </div>
    `;
  }

  private getVirtualSpacerHeights(): { top: number; bottom: number } {
    if (!this._virtualScroll) return { top: 0, bottom: 0 };
    const total = this.getEffectiveData().length;
    const { startIndex, endIndex } = this._virtualRange;
    return {
      top: startIndex * this._itemSize,
      bottom: Math.max(0, (total - endIndex) * this._itemSize),
    };
  }

  private renderHeader(col: DatatableColumnDef, _index: number): TemplateResult {
    const sortable = col.sortable ?? true;
    const sortIndex = this._sortColumns.findIndex((s) => s.property === col.name);
    const sortDirection = sortIndex >= 0 ? this._sortColumns[sortIndex].direction : null;
    const width = this._columnWidths.get(col.name) ?? col.width;
    const headerContent: CellContent = col.headerRenderer ? col.headerRenderer(col) : (col.label ?? col.name);

    const style: Record<string, string> = {};
    if (typeof width === 'number') {
      style['width'] = `${width}px`;
      style['minWidth'] = `${width}px`;
    }

    return html`
      <th
        scope="col"
        data-column=${col.name}
        data-sortable=${sortable ? 'true' : 'false'}
        aria-sort=${sortDirection
          ? sortDirection === 'ascending'
            ? 'ascending'
            : 'descending'
          : 'none'}
        style=${styleMap(style)}
        @click=${(ev: MouseEvent) => this.onHeaderClick(col, ev)}
      >
        <span class="header-cell">
          <span>${renderContent(headerContent)}</span>
          ${sortIndex >= 0 && this._sortColumns.length > 1
            ? html`<span class="sort-index">${sortIndex + 1}</span>`
            : nothing}
        </span>
        ${this._resizableColumns
          ? html`<span
              class="resize-handle"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize column ${col.label ?? col.name}"
              @pointerdown=${(ev: PointerEvent) => this.startColumnResize(col, ev)}
            ></span>`
          : nothing}
      </th>
    `;
  }

  private renderRow(flat: FlatVisibleRow, key: string, rowIndex: number, showCheckboxes: boolean): TemplateResult {
    const { row, depth, isExpanded, isPlaceholder } = flat;
    const selected = !isPlaceholder && this._selectedIds.has(key);
    const cut = !isPlaceholder && this._cutIds.has(key);
    const focused = !isPlaceholder && this._focusedRowKey === key;
    const childCount = isPlaceholder ? 0 : this.extractChildCount(row);
    const hasChevron = this._tree && !isPlaceholder && childCount > 0;
    const indeterminate = !isPlaceholder && row != null && this.isParentIndeterminate(row);

    return html`
      <tr
        role="row"
        aria-rowindex=${rowIndex + 2}
        aria-level=${this._tree ? depth + 1 : nothing}
        aria-expanded=${this._tree && childCount > 0 ? (isExpanded ? 'true' : 'false') : nothing}
        aria-busy=${isPlaceholder ? 'true' : nothing}
        aria-selected=${!isPlaceholder && this._selectionMode !== 'none' ? (selected ? 'true' : 'false') : nothing}
        data-row-key=${key}
        data-selected=${selected ? 'true' : 'false'}
        data-cut=${cut ? 'true' : 'false'}
        data-focused=${focused ? 'true' : 'false'}
        data-placeholder=${isPlaceholder ? 'true' : 'false'}
        data-depth=${this._tree ? String(depth) : nothing}
        data-clickable=${!isPlaceholder && (this._selectionMode !== 'none' || this.hasRowClickListeners()) ? 'true' : 'false'}
        @click=${isPlaceholder ? null : (ev: MouseEvent) => this.onRowClick(row, key, rowIndex, ev)}
        @dblclick=${isPlaceholder ? null : (ev: MouseEvent) => this.onRowDblClick(row, key, rowIndex, ev)}
        @contextmenu=${isPlaceholder ? null : (ev: MouseEvent) => this.onRowContextMenu(row, key, rowIndex, ev)}
        @keydown=${this._tree && !isPlaceholder ? (ev: KeyboardEvent) => this.onRowKeydown(row!, flat.parentId, depth, isExpanded, childCount, ev) : null}
      >
        ${this._tree
          ? html`<td class="tree-chevron-cell" style=${styleMap({ paddingInlineStart: `${depth * this._treeIndent}rem` })}>
              ${hasChevron
                ? html`<button
                    type="button"
                    class="tree-chevron"
                    aria-label=${isExpanded ? 'Collapse row' : 'Expand row'}
                    aria-expanded=${isExpanded ? 'true' : 'false'}
                    data-expanded=${isExpanded ? 'true' : 'false'}
                    @click=${(ev: MouseEvent) => this.toggleExpand(row!, flat.parentId, depth, ev)}
                  >${isExpanded ? '▾' : '▸'}</button>`
                : nothing}
            </td>`
          : nothing}
        ${showCheckboxes
          ? html`<td class="checkbox-cell" @click=${(e: Event) => e.stopPropagation()}>
              ${isPlaceholder
                ? nothing
                : html`<mp-checkbox
                    aria-label=${`Select row ${rowIndex + 1}`}
                    .checked=${selected}
                    .indeterminate=${indeterminate}
                    @change=${(ev: Event) => this.onRowCheckboxToggle(row, key, rowIndex, ev)}
                  ></mp-checkbox>`}
            </td>`
          : nothing}
        ${this._rowRenderer
          ? this.renderRowFromRenderer(row, rowIndex, { depth, isExpanded, isPlaceholder })
          : isPlaceholder
            ? html`<td colspan=${this._columns.length} class="tree-placeholder-cell" aria-label="Loading">…</td>`
            : this._columns.map((col) => this.renderCell(row, col, rowIndex))}
      </tr>
    `;
  }

  private renderRowFromRenderer(row: unknown, rowIndex: number, ctx: RowRenderContext): unknown {
    const out = this._rowRenderer!(row, rowIndex, ctx);
    if (out == null) {
      if (ctx.isPlaceholder) {
        return html`<td colspan=${this._columns.length} class="tree-placeholder-cell" aria-label="Loading">…</td>`;
      }
      return this._columns.map((col) => this.renderCell(row, col, rowIndex));
    }
    if (Array.isArray(out) || isIterableNotString(out)) {
      const nodes: Node[] = [];
      for (const item of out as Iterable<Node>) nodes.push(item);
      return nodes;
    }
    return out as Node;
  }

  private renderCell(row: unknown, col: DatatableColumnDef, rowIndex: number): TemplateResult {
    const content = col.cellRenderer
      ? col.cellRenderer(row, col, rowIndex)
      : defaultCellContent(row, col);
    return html`<td class=${col.cellClass ?? ''} data-column=${col.name}>${renderContent(content)}</td>`;
  }

  private renderFooter(totalPages: number): TemplateResult {
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    return html`
      <div class="datatable-footer">
        <mp-pagination
          class="datatable-per-page"
          aria-label="Rows per page"
          .pageNumbers=${this._perPageOptions}
          .selectedPageNumber=${this._perPage}
          .showArrows=${false}
          @mp-pagination-page-change=${(ev: Event) =>
            this.setPerPage((ev as CustomEvent<PageChangeEventDetail>).detail.page)}
        ></mp-pagination>
        <mp-pagination
          class="datatable-pagination"
          .pageNumbers=${pageNumbers}
          .selectedPageNumber=${this._page}
          .numberOfBoxes=${7}
          .showArrows=${true}
          @mp-pagination-page-change=${(ev: Event) =>
            this.gotoPage((ev as CustomEvent<PageChangeEventDetail>).detail.page)}
        ></mp-pagination>
      </div>
    `;
  }

  private setPerPage(value: number): void {
    const next = Math.max(1, Math.floor(value || 1));
    if (this._perPage === next) return;
    this._perPage = next;
    this._page = 1;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<{ perPage: number }>('mp-datatable-per-page-change', {
        detail: { perPage: next },
        bubbles: true,
        composed: true,
      }),
    );
    // Also re-emit a page-change so the wrapper picks up the page reset.
    this.dispatchEvent(
      new CustomEvent<{ page: number }>('mp-datatable-page-change', {
        detail: { page: 1 },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private getEffectiveData(): unknown[] {
    // In tree mode the source for virtual-scroll math is the flattened tree
    // (real rows + placeholders); callers that need row metadata use
    // `getFlatList()` instead. We keep this method returning a `unknown[]`
    // so `_data.length`-style code paths stay valid.
    if (this._tree || this.isRootWindowed()) {
      // Tree: flattened forest (rows + placeholders). Root-windowed flat: the
      // sparse length-`totalRecords` list. Both drive the virtual-scroll count.
      return this.getFlatList().map((r) => r.row);
    }
    let rows: unknown[] = this._data;
    if (this._autoSort && this._sortColumns.length > 0) {
      rows = sortRows(rows, this._sortColumns);
    }
    // Internal pagination only slices when the WC owns the full dataset. With
    // external paging (consumer feeds one page at a time) the rows are
    // already pre-sliced — slicing again would render nothing past page 1.
    if (this._pagination && !this.isExternallyPaged()) {
      const start = (this._page - 1) * this._perPage;
      rows = rows.slice(start, start + this._perPage);
    }
    return rows;
  }

  /**
   * Flat list of visible rows including expansion + placeholders. Computed
   * each render in tree mode; flat mode produces a trivial mapping of `_data`
   * (after sort+pagination) with default metadata.
   *
   * Memoised via `_cachedFlatList`, cleared in `willUpdate`. Multiple calls
   * during the same render cycle (`computeVisibleRows`,
   * `getVirtualSpacerHeights`, aria-rowcount) share one computation.
   */
  private getFlatList(): FlatVisibleRow[] {
    if (this._cachedFlatList !== null) return this._cachedFlatList;
    if (!this._tree) {
      // Flat virtual + external paging: build a sparse list of length
      // `_totalRecords`. Loaded rows come from `_data` (page 1) and
      // `_pageCache` (pages ≥ 2); every not-yet-loaded slot is a placeholder so
      // the virtualizer sizes the scroll region from the true total and
      // `maybeFetchPagesInViewport` can pull the missing pages on demand.
      // No client sort here: `_autoSort` is false in fetch mode (the server
      // owns ordering), so page ordering is authoritative.
      //
      // NOTE: this materialises one entry per total row. It is memoised per
      // render (cleared in `willUpdate`) and the realistic totals for
      // server-paged lists are bounded; revisit with slice-only
      // materialisation if very large totals ever jank.
      //
      // Page 1 is assumed to fill `_data` to `perPage` rows (the `[fetch]`
      // contract honours the requested perPage). If a server caps page 1 below
      // perPage while the total spans multiple pages, indices past `_data`
      // would map to page 1 and never resolve (`maybeFetchPagesInViewport`
      // skips page ≤ 1) — out of contract, not handled here.
      if (this.isRootWindowed()) {
        const total = this._totalRecords ?? this._data.length;
        const perPage = Math.max(1, this._perPage);
        const out: FlatVisibleRow[] = new Array(total);
        for (let i = 0; i < total; i++) {
          const page = Math.floor(i / perPage) + 1;
          const pos = i % perPage;
          const row = page === 1 ? this._data[pos] : this._pageCache.get(page)?.[pos];
          out[i] = row !== undefined
            ? { row, key: this._rowKey(row, i), depth: 0, parentId: null, isExpanded: false, isPlaceholder: false }
            : { row: undefined, key: `__placeholder-flat-${i}`, depth: 0, parentId: null, page, isExpanded: false, isPlaceholder: true };
        }
        return this._cachedFlatList = out;
      }

      const rows = (() => {
        let r: unknown[] = this._data;
        if (this._autoSort && this._sortColumns.length > 0) r = sortRows(r, this._sortColumns);
        if (this._pagination && !this.isExternallyPaged()) {
          const start = (this._page - 1) * this._perPage;
          r = r.slice(start, start + this._perPage);
        }
        return r;
      })();
      return this._cachedFlatList = rows.map((row, i) => ({
        row,
        key: this._rowKey(row, i),
        depth: 0,
        parentId: null,
        isExpanded: false,
        isPlaceholder: false,
      }));
    }

    // ── Tree mode ──
    const out: FlatVisibleRow[] = [];
    const perPage = Math.max(1, this._perPage);
    const sortChildren = (rows: unknown[]): unknown[] =>
      this._autoSort && this._sortColumns.length > 0 ? sortRows(rows, this._sortColumns) : rows;

    // Push a real node and, when it's expanded, its loaded children followed by
    // placeholders for any not-yet-loaded children of that parent.
    const pushNode = (row: unknown, depth: number, parentId: unknown | null): void => {
      const id = this.extractId(row);
      const isExpanded = id != null && this._expandedIds.has(id);
      const childCount = this.extractChildCount(row);
      out.push({ row, key: this._rowKey(row, out.length), depth, parentId, isExpanded, isPlaceholder: false });

      if (!isExpanded || childCount === 0 || id == null) return;

      const cached = this._childCache.get(id);
      if (cached && cached.length > 0) {
        for (const child of sortChildren(cached)) pushNode(child, depth + 1, id);
        const total = this._childTotals.get(id) ?? cached.length;
        for (let j = 0; j < Math.max(0, total - cached.length); j++) {
          out.push({ row: undefined, key: `__placeholder-${String(id)}-${cached.length + j}`, depth: depth + 1, parentId: id, isExpanded: false, isPlaceholder: true });
        }
      } else {
        // Expanded but children not loaded yet — reserve childCount placeholders.
        for (let j = 0; j < childCount; j++) {
          out.push({ row: undefined, key: `__placeholder-${String(id)}-${j}`, depth: depth + 1, parentId: id, isExpanded: false, isPlaceholder: true });
        }
      }
    };

    if (this.isRootWindowed()) {
      // Roots paginate lazily, exactly like flat mode: root page 1 is `_data`,
      // pages ≥ 2 come from `_pageCache`, and unloaded root slots are
      // placeholders (keyed by page, parentId null) so the scroll region spans
      // every root and scrolling pulls the missing root pages via
      // `maybeFetchPagesInViewport`. Loaded + expanded roots still inline their
      // children. No client sort — the server owns root ordering in fetch mode.
      const rootTotal = this._totalRecords ?? this._data.length;
      for (let r = 0; r < rootTotal; r++) {
        const page = Math.floor(r / perPage) + 1;
        const pos = r % perPage;
        const root = page === 1 ? this._data[pos] : this._pageCache.get(page)?.[pos];
        if (root === undefined) {
          out.push({ row: undefined, key: `__placeholder-root-${r}`, depth: 0, parentId: null, page, isExpanded: false, isPlaceholder: true });
        } else {
          pushNode(root, 0, null);
        }
      }
    } else {
      const rootRows = this._autoSort && this._sortColumns.length > 0
        ? sortRows(this._data, this._sortColumns)
        : this._data;
      for (const row of rootRows) pushNode(row, 0, null);
    }

    return this._cachedFlatList = out;
  }

  private computeVisibleRows(): Array<{ row: unknown; key: string; rowIndex: number; flat: FlatVisibleRow }> {
    const flatList = this.getFlatList();
    const pageOffset = this._tree
      ? 0
      : this._pagination ? (this._page - 1) * this._perPage : 0;
    let sliced = flatList;
    let sliceOffset = 0;
    if (this._virtualScroll) {
      const { startIndex, endIndex } = this._virtualRange;
      sliced = flatList.slice(startIndex, endIndex);
      sliceOffset = startIndex;
    }
    return sliced.map((flat, indexWithinSlice) => {
      const rowIndex = pageOffset + sliceOffset + indexWithinSlice;
      return { row: flat.row, rowIndex, key: flat.key, flat };
    });
  }

  // ─── Tree-mode helpers ───────────────────────────────────────────────────

  private extractId(row: unknown): unknown {
    if (!this._idKey || row == null || typeof row !== 'object') return null;
    if (typeof this._idKey === 'function') return (this._idKey as (r: unknown) => unknown)(row);
    return (row as Record<string, unknown>)[this._idKey as string];
  }

  private extractChildCount(row: unknown): number {
    if (!this._childCountKey || row == null || typeof row !== 'object') return 0;
    const v = (row as Record<string, unknown>)[this._childCountKey];
    return typeof v === 'number' && v > 0 ? v : 0;
  }

  /** Walks the loaded subtree of `row` and returns the rowKey for every descendant. */
  private collectDescendantKeys(row: unknown): string[] {
    const id = this.extractId(row);
    const cached = id != null ? this._childCache.get(id) : undefined;
    if (!cached) return [];
    const out: string[] = [];
    for (const child of cached) {
      out.push(this._rowKey(child, -1));
      const sub = this.collectDescendantKeys(child);
      for (const k of sub) out.push(k);
    }
    return out;
  }

  /** Some-but-not-all loaded descendants selected → indeterminate parent checkbox. */
  private isParentIndeterminate(row: unknown): boolean {
    if (this._selectionStrategy !== 'cascading' || row == null) return false;
    return this.getIndeterminateKeys().has(this._rowKey(row, -1));
  }

  /**
   * Per-render memo: the set of row keys whose loaded subtree is partially
   * selected. Built in one DFS over `_childCache` so each loaded parent is
   * visited exactly once per render. Replaces the previous
   * `collectDescendantKeys`-per-visible-row recursion which was O(visible ×
   * descendants) per render.
   */
  private getIndeterminateKeys(): Set<string> {
    if (this._cachedIndeterminateKeys !== null) return this._cachedIndeterminateKeys;
    const out = new Set<string>();
    if (this._selectionStrategy !== 'cascading' || !this._tree) {
      return this._cachedIndeterminateKeys = out;
    }

    // Returns the row's descendant-only (selectedCount, totalCount).
    // Adds the row's key to `out` if `0 < selected < total`.
    const visit = (row: unknown): { selected: number; total: number } => {
      const id = this.extractId(row);
      if (id == null) return { selected: 0, total: 0 };
      const children = this._childCache.get(id);
      if (!children || children.length === 0) return { selected: 0, total: 0 };
      let selected = 0;
      let total = 0;
      for (const child of children) {
        const childKey = this._rowKey(child, -1);
        const childSelected = this._selectedIds.has(childKey) ? 1 : 0;
        const sub = visit(child);
        selected += childSelected + sub.selected;
        total += 1 + sub.total;
      }
      if (total > 0 && selected > 0 && selected < total) {
        out.add(this._rowKey(row, -1));
      }
      return { selected, total };
    };

    for (const row of this._data) visit(row);
    return this._cachedIndeterminateKeys = out;
  }

  /**
   * Toggle a row's expanded state. On expand, fires a fetch-request event if
   * children aren't cached yet so the wrapper can bridge to the consumer's
   * `[fetch]` callback. Always fires `expanded-ids-change`.
   */
  private toggleExpand(row: unknown, parentId: unknown | null, depth: number, ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    const id = this.extractId(row);
    if (id == null) return;
    const next = new Set(this._expandedIds);
    let willBeExpanded: boolean;
    if (next.has(id)) {
      next.delete(id);
      willBeExpanded = false;
    } else {
      next.add(id);
      willBeExpanded = true;
    }
    this._expandedIds = next;

    if (willBeExpanded) {
      this.dispatchEvent(
        new CustomEvent<TreeRowExpandDetail>('mp-datatable-row-expand', {
          detail: { row, depth, parentId },
          bubbles: true,
          composed: true,
        }),
      );
      // Fire a fetch request if the consumer hasn't already populated the cache.
      const cc = this.extractChildCount(row);
      if (cc > 0 && !this._childCache.has(id) && !this._pendingFetches.has(id)) {
        this.requestChildrenFetch(id);
      }
    } else {
      this.dispatchEvent(
        new CustomEvent<TreeRowExpandDetail>('mp-datatable-row-collapse', {
          detail: { row, depth, parentId },
          bubbles: true,
          composed: true,
        }),
      );
    }

    this.emitExpandedIdsChange();
    this.requestUpdate();
  }

  private emitExpandedIdsChange(): void {
    this.dispatchEvent(
      new CustomEvent<TreeExpandedIdsChangeDetail>('mp-datatable-expanded-ids-change', {
        detail: { expandedIds: new Set(this._expandedIds) },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Emit a fetch-request event the wrapper will bridge to the consumer's `[fetch]`. */
  private requestChildrenFetch(parentId: unknown | null): void {
    if (parentId != null) this._pendingFetches.add(parentId);
    this.dispatchEvent(
      new CustomEvent<TreeFetchRequestDetail>('mp-datatable-fetch-request', {
        detail: {
          parentId,
          page: 1,
          perPage: this._perPage,
          sortColumns: [...this._sortColumns],
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Flat-window counterpart of `requestChildrenFetch`: emit a fetch-request for
   * a specific page (≥ 2). `parentId: null` + a real `page` is the wire shape
   * the wrapper bridges to `[fetch]({ page, perPage, sortColumns })`.
   */
  private requestPageFetch(page: number): void {
    this._pendingPageFetches.add(page);
    this.dispatchEvent(
      new CustomEvent<TreeFetchRequestDetail>('mp-datatable-fetch-request', {
        detail: {
          parentId: null,
          page,
          perPage: this._perPage,
          sortColumns: [...this._sortColumns],
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Public method called by the framework wrapper after the consumer's
   * `[fetch]` callback resolves. Populates the cache + total, clears the
   * pending flag, and rerenders so placeholders disappear.
   *
   * `parentId == null` is a **root window** (flat rows, or the top level of a
   * tree): `response.page` keys the page cache. Page 1 is owned by the `data`
   * setter, so a page-1 response here is a no-op. `parentId != null` is a tree
   * child set, keyed by parentId. Root-window vs child is decided by parentId,
   * not by `this._tree`, so a virtual tree windows BOTH its roots and children.
   */
  public setFetchResponse(parentId: unknown | null, response: TreeFetchResponse): void {
    if (parentId == null) {
      // Root window: store by page. Page 1 lives in `_data` (seeded by the
      // wrapper's first-page fetch), so ignore it here.
      const page = response.page;
      if (page == null || page <= 1) return;
      this._pendingPageFetches.delete(page);
      this._pageCache.set(page, [...response.data]);
      const total = response.totalRecords == null ? null : Math.max(0, Math.floor(response.totalRecords));
      if (total != null && total !== this._totalRecords) this._totalRecords = total;
      this.requestUpdate();
      return;
    }
    this._pendingFetches.delete(parentId);
    this._childCache.set(parentId, [...response.data]);
    this._childTotals.set(parentId, response.totalRecords);
    this.requestUpdate();
  }

  /** Drop cached children for one parent (or all). Used on sort change / refresh. */
  public invalidateChildren(parentId?: unknown): void {
    if (parentId === undefined) {
      this._childCache.clear();
      this._childTotals.clear();
      this._pendingFetches.clear();
    } else {
      this._childCache.delete(parentId);
      this._childTotals.delete(parentId);
      this._pendingFetches.delete(parentId);
    }
    this.requestUpdate();
  }

  /**
   * Drop the flat virtual-window page cache + in-flight set. Called by the
   * wrapper on sort/settings change before refetching page 1, so stale pages
   * don't survive a re-sort (mirrors `invalidateChildren` for tree mode).
   */
  public invalidateData(): void {
    this._pageCache.clear();
    this._pendingPageFetches.clear();
    this.requestUpdate();
  }

  /** Keyboard handling on a tree-mode row. Arrow keys + Enter/Space toggle expansion. */
  private onRowKeydown(
    row: unknown,
    parentId: unknown | null,
    depth: number,
    isExpanded: boolean,
    childCount: number,
    ev: KeyboardEvent,
  ): void {
    if (ev.key === 'ArrowRight' && childCount > 0 && !isExpanded) {
      this.toggleExpand(row, parentId, depth, ev);
    } else if (ev.key === 'ArrowLeft' && isExpanded) {
      this.toggleExpand(row, parentId, depth, ev);
    } else if ((ev.key === 'Enter' || ev.key === ' ') && childCount > 0) {
      this.toggleExpand(row, parentId, depth, ev);
    }
  }

  private hasRowClickListeners(): boolean {
    // We can't introspect listeners; assume yes (cheaper than a "set cursor" attribute).
    return true;
  }

  private onHeaderClick(col: DatatableColumnDef, ev: MouseEvent): void {
    const sortable = col.sortable ?? true;
    if (!sortable) return;
    const target = ev.target as HTMLElement;
    if (target.closest('.resize-handle')) return;
    const next = computeNextSort(this._sortColumns, col.name, ev.shiftKey);
    this._sortColumns = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<SortChangeEventDetail>('mp-datatable-sort-change', {
        detail: { sortColumns: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onRowClick(row: unknown, key: string, rowIndex: number, ev: MouseEvent): void {
    if ((ev.target as HTMLElement).closest('input[type="checkbox"]')) return;
    this._focusedRowKey = key;
    this.handleSelectionOnClick(key, ev);
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<RowEventDetail>('mp-datatable-row-click', {
        detail: { row, rowIndex, rowKey: key, originalEvent: ev },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onRowDblClick(row: unknown, key: string, rowIndex: number, ev: MouseEvent): void {
    this.dispatchEvent(
      new CustomEvent<RowEventDetail>('mp-datatable-row-dblclick', {
        detail: { row, rowIndex, rowKey: key, originalEvent: ev },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onRowContextMenu(row: unknown, key: string, rowIndex: number, ev: MouseEvent): void {
    // Promote the row to the selection if not already selected (file-manager convention).
    if (this._selectionMode !== 'none' && !this._selectedIds.has(key)) {
      this._selectedIds = new Set([key]);
      this._focusedRowKey = key;
      this.emitSelectionChange();
      this.requestUpdate();
    }
    this.dispatchEvent(
      new CustomEvent<RowEventDetail>('mp-datatable-row-contextmenu', {
        detail: { row, rowIndex, rowKey: key, originalEvent: ev },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  private onRowCheckboxToggle(row: unknown, key: string, _rowIndex: number, _ev: Event): void {
    if (this._selectionMode === 'none') return;
    if (this._selectionMode === 'single') {
      this._selectedIds = new Set([key]);
    } else {
      const next = new Set(this._selectedIds);
      const willSelect = !next.has(key);
      if (willSelect) next.add(key);
      else next.delete(key);

      // Cascading: propagate to all currently-loaded descendants.
      if (this._tree && this._selectionStrategy === 'cascading' && row != null) {
        const descendantKeys = this.collectDescendantKeys(row);
        if (willSelect) {
          for (const k of descendantKeys) next.add(k);
        } else {
          for (const k of descendantKeys) next.delete(k);
        }
      }
      this._selectedIds = next;
    }
    this.emitSelectionChange();
    this.requestUpdate();
  }

  /**
   * Clears the entire selection. The header checkbox is only rendered when
   * at least one row is selected — a true "select all" affordance would be
   * misleading because the WC doesn't know about rows outside the current
   * pagination slice or virtual-scroll window. Click semantics are
   * therefore one-way: visible → deselect-all → hidden again.
   */
  private onDeselectAll(): void {
    if (this._selectedIds.size === 0) return;
    this._selectedIds = new Set();
    this.emitSelectionChange();
    this.requestUpdate();
  }

  private handleSelectionOnClick(key: string, ev: MouseEvent): void {
    if (this._selectionMode === 'none') return;
    if (this._selectionMode === 'single') {
      this._selectedIds = new Set([key]);
      this.emitSelectionChange();
      return;
    }
    // multiple
    if (ev.shiftKey && this._focusedRowKey && this._focusedRowKey !== key) {
      // Range select between focused row and clicked row
      const rows = this.computeVisibleRows();
      const fromIdx = rows.findIndex((r) => r.key === this._focusedRowKey);
      const toIdx = rows.findIndex((r) => r.key === key);
      if (fromIdx >= 0 && toIdx >= 0) {
        const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        const range = rows.slice(lo, hi + 1).map((r) => r.key);
        this._selectedIds = new Set([...this._selectedIds, ...range]);
        this.emitSelectionChange();
        return;
      }
    }
    if (ev.ctrlKey || ev.metaKey) {
      const next = new Set(this._selectedIds);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      this._selectedIds = next;
      this.emitSelectionChange();
      return;
    }
    this._selectedIds = new Set([key]);
    this.emitSelectionChange();
  }

  private emitSelectionChange(): void {
    this.dispatchEvent(
      new CustomEvent<SelectionChangeEventDetail>('mp-datatable-selection-change', {
        detail: { selectedIds: [...this._selectedIds] },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private gotoPage(page: number): void {
    const denominator = this._totalRecords ?? this._data.length;
    const totalPages = Math.max(1, Math.ceil(denominator / this._perPage));
    this._page = Math.max(1, Math.min(totalPages, page));
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<{ page: number }>('mp-datatable-page-change', {
        detail: { page: this._page },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ─── Column resize ───────────────────────────────────────────────────────
  private resizeState: {
    columnName: string;
    startX: number;
    startWidth: number;
    handle: HTMLElement;
  } | null = null;

  private startColumnResize(col: DatatableColumnDef, ev: PointerEvent): void {
    if (!this._resizableColumns) return;
    ev.preventDefault();
    ev.stopPropagation();
    const handle = ev.currentTarget as HTMLElement;
    const th = handle.closest('th') as HTMLTableCellElement | null;
    if (!th) return;
    const startWidth = th.getBoundingClientRect().width;
    this.resizeState = { columnName: col.name, startX: ev.clientX, startWidth, handle };
    handle.classList.add('active');
    handle.setPointerCapture(ev.pointerId);
    handle.addEventListener('pointermove', this.onColumnResizeMove);
    handle.addEventListener('pointerup', this.onColumnResizeEnd);
    handle.addEventListener('pointercancel', this.onColumnResizeEnd);
  }

  private onColumnResizeMove = (ev: PointerEvent): void => {
    if (!this.resizeState) return;
    const dx = ev.clientX - this.resizeState.startX;
    const next = Math.max(40, this.resizeState.startWidth + dx);
    this._columnWidths = new Map(this._columnWidths);
    this._columnWidths.set(this.resizeState.columnName, next);
    this.requestUpdate();
  };

  private onColumnResizeEnd = (ev: PointerEvent): void => {
    if (!this.resizeState) return;
    this.resizeState.handle.classList.remove('active');
    this.resizeState.handle.removeEventListener('pointermove', this.onColumnResizeMove);
    this.resizeState.handle.removeEventListener('pointerup', this.onColumnResizeEnd);
    this.resizeState.handle.removeEventListener('pointercancel', this.onColumnResizeEnd);
    try {
      this.resizeState.handle.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    this.resizeState = null;
  };
}

function defaultCellContent(row: unknown, col: DatatableColumnDef): CellContent {
  if (row == null || typeof row !== 'object') return '';
  const value = (row as Record<string, unknown>)[col.name];
  if (value == null) return '';
  return String(value);
}

function isIterableNotString(value: unknown): value is Iterable<unknown> {
  return (
    value != null &&
    typeof value !== 'string' &&
    typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function'
  );
}

function renderContent(content: CellContent): unknown {
  if (content == null || content === false) return nothing;
  if (content instanceof Node) return content;
  if (typeof content === 'object' && '_$litType$' in (content as object)) {
    return content;
  }
  return content;
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-datatable')) {
  customElements.define('mp-datatable', MpDatatable);
}
