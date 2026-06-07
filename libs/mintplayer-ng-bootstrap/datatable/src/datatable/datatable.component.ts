import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  EmbeddedViewRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
  ViewContainerRef,
  viewChild,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { PaginationRequest, PaginationResponse, SortColumn } from '@mintplayer/pagination';
import {
  computeNextSort,
  type DatatableColumnDef,
  type DatatableSelectionMode,
  type MpDatatable,
  type RowEventDetail,
  type RowRenderer,
  type SortChangeEventDetail,
  type SelectionChangeEventDetail,
  type TreeFetchRequestDetail,
  type TreeRowExpandDetail,
  type TreeExpandedIdsChangeDetail,
  type TreeIdKey,
  type TreeSelectionStrategy,
} from '@mintplayer/web-components/datatable';

// Side-effect import: registers <mp-datatable>.
import '@mintplayer/web-components/datatable';

import { DatatableSettings } from '../datatable-settings';
import { BsDatatableFetch, BsDatatableFetchRequest } from '../datatable-fetch';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { BsRowTemplateDirective, BsRowTemplateContext } from '../row-template/row-template.directive';

export interface BsDatatableRowEvent<T> {
  row: T;
  rowIndex: number;
  rowKey: string;
  originalEvent: Event;
}

export interface BsDatatableTreeRowEvent<T> {
  row: T;
  depth: number;
  parentId: unknown | null;
}

@Component({
  selector: 'bs-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDatatableComponent<TData> implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Programmatic column list. Mutually exclusive with the `*bsDatatableColumn`
   * template directives — if provided, takes precedence.
   */
  readonly columnsInput = input<DatatableColumnDef<TData>[] | null>(null, { alias: 'columns' });

  /** Static (already-paginated) data array. Use `[fetch]` for server-side pagination. */
  readonly data = input<TData[] | null>(null);

  /** Async data loader (server-side pagination). Mutually exclusive with `[data]`. */
  readonly fetch = input<BsDatatableFetch<TData> | null>(null);

  /** Two-way bound pagination / sort settings. */
  readonly settings = model<DatatableSettings>(new DatatableSettings());

  /** `'none'` hides selection; `'multiple'` shows checkboxes; `'single'` is a single-row selection. */
  readonly selectionMode = input<DatatableSelectionMode>('none');
  /** @deprecated Use `selectionMode`. Kept for source-level compatibility. */
  readonly selectable = input<DatatableSelectionMode | undefined>(undefined);

  /** Two-way bound array of selected rows (identity via `rowKey`). */
  readonly selection = model<TData[]>([]);

  /** Required for selection / async refetch identity. Default `String((row as any).id)`. */
  readonly rowKey = input<(row: TData, index: number) => string>((row: TData, index: number) => {
    const r = row as { id?: unknown } | null;
    return r && r.id != null ? String(r.id) : `row-${index}`;
  });

  /** Drag-resize column widths. Default `true`. */
  readonly resizableColumns = input<boolean>(true);

  /** Built-in pagination footer. Ignored when `[fetch]` is provided (server-side paging owns the page state). */
  readonly pagination = input<boolean>(true);

  /** Enable virtual scrolling for large datasets. */
  readonly virtualScroll = input<boolean>(false);
  /** Approximate row height in px (drives virtual scroll). */
  readonly itemSize = input<number>(40);
  /** Off-screen row buffer per side for virtual scrolling. */
  readonly virtualBuffer = input<number>(10);

  /** Forwarded to the inner table (legacy responsive flag, currently a CSS hook). */
  readonly isResponsive = input<boolean>(false);

  /** Optional row equality predicate (selection identity across re-fetches). */
  readonly compareWith = input<((a: TData, b: TData) => boolean) | undefined>(undefined);

  /** Emitted on row single-click. */
  readonly rowClick = output<BsDatatableRowEvent<TData>>();
  /** Emitted on row double-click. */
  readonly rowDblClick = output<BsDatatableRowEvent<TData>>();
  /** Emitted on row context-menu. */
  readonly rowContextMenu = output<BsDatatableRowEvent<TData>>();

  // ─── Tree-mode inputs / models / outputs ─────────────────────────────────

  /** Enable tree mode (chevron column, nested expansion, lazy children). */
  readonly tree = input<boolean>(false);

  /**
   * Property name (or function) that extracts the row's stable identity.
   * Required when `tree=true`. Used as the expansion key and as the
   * `parentId` value the WC sends in `mp-datatable-fetch-request`.
   */
  readonly idKey = input<TreeIdKey<TData> | null>(null);

  /**
   * Property name on the row holding the direct-child count. Drives chevron
   * visibility AND placeholder reservation for lazy children. Required when
   * `tree=true`.
   */
  readonly childCountKey = input<string | null>(null);

  /** Indent in rem per depth level on the chevron cell. Default `1.25`. */
  readonly treeIndent = input<number>(1.25);

  /** Two-way bound set of expanded-row ids (keyed by `idKey`). */
  readonly expandedIds = model<Set<unknown>>(new Set());

  /**
   * `'flat'` (default) leaves selection to per-row toggles; `'cascading'`
   * (recommended in tree mode) propagates a parent toggle to all loaded
   * descendants and surfaces an indeterminate state on partially-selected
   * parents.
   */
  readonly selectionStrategy = input<TreeSelectionStrategy>('flat');

  /** Emitted after a row is expanded. */
  readonly rowExpand = output<BsDatatableTreeRowEvent<TData>>();
  /** Emitted after a row is collapsed. */
  readonly rowCollapse = output<BsDatatableTreeRowEvent<TData>>();

  readonly datatableRef = viewChild<ElementRef<MpDatatable>>('datatable');

  /** Column directives (header template + sortable). Wrapper-level discovery. */
  readonly columnDirectives = contentChildren(BsDatatableColumnDirective);

  /** Optional row template. When present, drives a per-row EmbeddedView render path. */
  readonly rowTemplate = contentChild(BsRowTemplateDirective<TData>);

  /** Internal data source — populated either from `data()` or from `fetch()` responses. */
  protected readonly currentData = signal<TData[]>([]);
  protected readonly totalRecords = signal<number>(0);

  /**
   * Merged column defs:
   *  - `[columns]` if provided
   *  - else the `*bsDatatableColumn` directives mapped onto column defs whose
   *    `headerRenderer` returns a DOM node produced from the directive's template.
   */
  protected readonly effectiveColumns = computed<DatatableColumnDef<TData>[]>(() => {
    const programmatic = this.columnsInput();
    if (programmatic && programmatic.length) return programmatic;
    return this.columnDirectives().map((dir): DatatableColumnDef<TData> => {
      let headerView: EmbeddedViewRef<unknown> | undefined;
      return {
        name: dir.name(),
        sortable: dir.sortable(),
        headerRenderer: () => {
          if (!headerView) {
            headerView = this.vcr.createEmbeddedView(dir.templateRef);
            this.headerViews.push(headerView);
          }
          headerView.detectChanges();
          const nodes = headerView.rootNodes.filter((n: unknown): n is Node => n instanceof Node);
          if (nodes.length === 0) return '';
          if (nodes.length === 1) return nodes[0];
          const frag = document.createDocumentFragment();
          for (const n of nodes) frag.appendChild(n);
          return frag;
        },
      };
    });
  });

  /** EmbeddedViews for header templates (one per column directive). */
  private headerViews: EmbeddedViewRef<unknown>[] = [];
  /** EmbeddedViews for row templates, keyed by rowKey for reuse. */
  private rowViews = new Map<string, EmbeddedViewRef<BsRowTemplateContext<TData>>>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      for (const v of this.headerViews) v.destroy();
      this.headerViews = [];
      for (const v of this.rowViews.values()) v.destroy();
      this.rowViews.clear();
    });

    // Sync data input → internal source.
    effect(() => {
      const d = this.data();
      if (d !== null) {
        this.currentData.set(d);
        this.totalRecords.set(d.length);
      }
    });

    // Async fetch: re-run on fetch / settings changes. In flat virtual mode the
    // wrapper fetches only page 1 (for the total + initial rows); the WC pulls
    // the remaining pages on demand as they scroll into view via
    // `mp-datatable-fetch-request` (bridged by `onFetchRequest` below). In tree
    // mode the wrapper does one root-page fetch and the WC pulls children the
    // same way. Neither front-loads the whole result set.
    effect(() => {
      if (isPlatformServer(this.platformId)) return;
      const fetcher = this.fetch();
      if (!fetcher) return;
      const settings = this.settings();
      if (this.tree()) {
        const req: BsDatatableFetchRequest = {
          page: settings.page.selected,
          perPage: settings.perPage.selected,
          sortColumns: settings.sortColumns,
          parentId: undefined,
        };
        // Sort changes invalidate the per-parent child cache (server-side sort
        // applies within siblings, so cached children are stale) AND the lazy
        // root-page window cache (root ordering across pages changes too).
        const el = this.datatableRef()?.nativeElement;
        if (el && typeof el.invalidateChildren === 'function') el.invalidateChildren();
        if (el && typeof el.invalidateData === 'function') el.invalidateData();
        void this.runFetch(fetcher, req, settings);
      } else if (this.virtualScroll()) {
        // Sort/settings changes invalidate the windowed page cache (the page
        // boundaries + ordering are stale) before the page-1 refetch — mirrors
        // the tree `invalidateChildren()` above.
        const el = this.datatableRef()?.nativeElement;
        if (el && typeof el.invalidateData === 'function') el.invalidateData();
        void this.runVirtualFetchFirst(fetcher, settings);
      } else {
        const req: PaginationRequest = {
          page: settings.page.selected,
          perPage: settings.perPage.selected,
          sortColumns: settings.sortColumns,
        };
        void this.runFetch(fetcher, req, settings);
      }
    });

    // Forward columns + data to the WC.
    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.columns = this.effectiveColumns() as DatatableColumnDef[];
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.data = this.currentData() as unknown[];
      // Stale row views for rows no longer present are pruned lazily on next render.
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      const settings = this.settings();
      const fetching = !!this.fetch();
      const virtual = this.virtualScroll();
      el.sortColumns = settings.sortColumns.map((c) => ({ property: c.property, direction: c.direction }));
      el.autoSort = !fetching;
      // Pagination renders in non-virtual mode; in fetch mode the wrapper
      // owns page state and the WC just reports the change via event.
      el.pagination = this.pagination() && !virtual;
      el.page = settings.page.selected;
      el.perPage = settings.perPage.selected;
      el.perPageOptions = settings.perPage.values;
      el.totalRecords = fetching ? this.totalRecords() : null;
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      const mode = this.selectable() ?? this.selectionMode();
      el.selectionMode = mode;
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.rowKey = (row, index) => this.rowKey()(row as TData, index);
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.resizableColumns = this.resizableColumns();
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.virtualScroll = this.virtualScroll();
      el.itemSize = this.itemSize();
      el.virtualBuffer = this.virtualBuffer();
    });

    // Tree-mode prop sync to the WC.
    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.tree = this.tree();
      el.idKey = this.idKey() as TreeIdKey;
      el.childCountKey = this.childCountKey();
      el.treeIndent = this.treeIndent();
      el.selectionStrategy = this.selectionStrategy();
    });

    // Two-way bind `expandedIds` to the WC. Skip-on-echo via structural equality
    // — the WC's getter returns a fresh Set on every read.
    effect(() => {
      const desired = this.expandedIds();
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      const current = el.expandedIds;
      if (setsEqual(current, desired)) return;
      el.expandedIds = desired;
    });

    // Wire the row renderer when *bsRowTemplate is provided.
    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      const tpl = this.rowTemplate();
      if (!tpl) {
        el.rowRenderer = undefined;
        // Destroy any stale row views.
        for (const v of this.rowViews.values()) v.destroy();
        this.rowViews.clear();
        return;
      }
      el.rowRenderer = this.buildRowRenderer(tpl) as RowRenderer;
    });

    // Selection rows → IDs forwarded to WC.
    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      const rows = this.selection();
      const keyFn = this.rowKey();
      el.selectedIds = rows.map((row, i) => keyFn(row, i));
    });
  }

  ngAfterViewInit(): void {
    // Effects above re-run as the view is created; nothing else needed.
  }

  private buildRowRenderer(tpl: BsRowTemplateDirective<TData>): RowRenderer<TData> {
    return (row, rowIndex, ctx) => {
      // Placeholder rows (tree-mode, children pending fetch) get a synthetic key
      // so the view is reused per slot. Consumers detect them via `isPlaceholder`.
      const isPlaceholder = ctx?.isPlaceholder ?? row === undefined;
      const depth = ctx?.depth ?? 0;
      const isExpanded = ctx?.isExpanded ?? false;
      const key = isPlaceholder
        ? `__placeholder-${rowIndex}`
        : this.rowKey()(row as TData, rowIndex);
      let viewRef = this.rowViews.get(key);
      if (!viewRef) {
        const context = new BsRowTemplateContext<TData>();
        context.$implicit = row as TData | undefined;
        context.index = rowIndex;
        context.depth = depth;
        context.isExpanded = isExpanded;
        context.isPlaceholder = isPlaceholder;
        viewRef = this.vcr.createEmbeddedView(tpl.templateRef, context);
        this.rowViews.set(key, viewRef);
      } else {
        viewRef.context.$implicit = row as TData | undefined;
        viewRef.context.index = rowIndex;
        viewRef.context.depth = depth;
        viewRef.context.isExpanded = isExpanded;
        viewRef.context.isPlaceholder = isPlaceholder;
      }
      viewRef.detectChanges();
      const nodes = viewRef.rootNodes.filter((n: unknown): n is Node => n instanceof Node);
      return nodes;
    };
  }

  /** Generation token: invalidates an in-flight virtual-mode fetch when sort/fetcher changes. */
  private virtualFetchToken = 0;

  /**
   * Flat virtual mode: fetch only page 1 and report the total. The WC seeds
   * page 1 from `currentData` (via the `el.data` effect), sizes the scroll
   * region from `totalRecords`, and pulls pages ≥ 2 lazily as they scroll into
   * view — bridged back through `onFetchRequest`. The window size is
   * `settings.perPage`, so the WC's page index matches the fetch page.
   *
   * The `virtualFetchToken` guard drops a stale page-1 response from a previous
   * sort/fetcher generation so it can't clobber the current window.
   */
  private async runVirtualFetchFirst(
    fetcher: BsDatatableFetch<TData>,
    settings: DatatableSettings,
  ): Promise<void> {
    const token = ++this.virtualFetchToken;
    const first = await fetcher({
      page: 1,
      perPage: settings.perPage.selected,
      sortColumns: settings.sortColumns,
    });
    if (!first || token !== this.virtualFetchToken) return;
    this.currentData.set(first.data ?? []);
    this.totalRecords.set(first.totalRecords ?? first.data?.length ?? 0);
  }

  private async runFetch(
    fetcher: BsDatatableFetch<TData>,
    req: PaginationRequest,
    settings: DatatableSettings,
  ): Promise<void> {
    const response = await fetcher(req);
    if (!response) return;
    this.currentData.set(response.data ?? []);
    this.totalRecords.set(response.totalRecords ?? response.data?.length ?? 0);

    const desiredPageCount = Math.max(1, response.totalPages ?? 1);
    if (settings.page.values.length !== desiredPageCount) {
      this.settings.set(
        new DatatableSettings({
          ...settings,
          page: {
            values: Array.from({ length: desiredPageCount }, (_, i) => i + 1),
            selected: Math.min(settings.page.selected, desiredPageCount),
          },
        }),
      );
    }
  }

  // ─── WC event handlers ───────────────────────────────────────────────────

  onSortChange(event: Event): void {
    const detail = (event as CustomEvent<SortChangeEventDetail>).detail;
    const settings = this.settings();
    this.settings.set(
      new DatatableSettings({
        ...settings,
        sortColumns: detail.sortColumns as SortColumn[],
        page: { ...settings.page, selected: 1 },
      }),
    );
  }

  onSelectionChange(event: Event): void {
    const detail = (event as CustomEvent<SelectionChangeEventDetail>).detail;
    const keyFn = this.rowKey();

    // The naïve `currentData().filter(id ∈ idSet)` drops cross-page
    // selections in pagination mode — `currentData` only holds the
    // currently-visible page, so any id selected on a page the user has
    // since navigated away from disappears. Look up known IDs in
    // `selection()` first (rows from earlier pages we still remember),
    // then fall back to `currentData()` for IDs the WC just acknowledged
    // from the current page.
    const existingById = new Map<string, TData>();
    this.selection().forEach((row, i) => existingById.set(keyFn(row, i), row));
    const currentById = new Map<string, TData>();
    this.currentData().forEach((row, i) => currentById.set(keyFn(row, i), row));

    const next: TData[] = [];
    for (const id of detail.selectedIds) {
      const row = existingById.get(id) ?? currentById.get(id);
      if (row !== undefined) next.push(row);
    }
    this.selection.set(next);
  }

  onPageChange(event: Event): void {
    const detail = (event as CustomEvent<{ page: number }>).detail;
    const settings = this.settings();
    this.settings.set(
      new DatatableSettings({
        ...settings,
        page: { ...settings.page, selected: detail.page },
      }),
    );
  }

  onPerPageChange(event: Event): void {
    const detail = (event as CustomEvent<{ perPage: number }>).detail;
    const settings = this.settings();
    this.settings.set(
      new DatatableSettings({
        ...settings,
        perPage: { ...settings.perPage, selected: detail.perPage },
        page: { ...settings.page, selected: 1 },
      }),
    );
  }

  onRowClick(event: Event): void {
    this.rowClick.emit(this.toBsEvent(event));
  }
  onRowDblClick(event: Event): void {
    this.rowDblClick.emit(this.toBsEvent(event));
  }
  onRowContextMenu(event: Event): void {
    this.rowContextMenu.emit(this.toBsEvent(event));
  }

  // ─── Tree-mode event handlers ────────────────────────────────────────────

  /**
   * Bridge the WC's fetch-request to the consumer's `[fetch]` callback. Fires
   * for tree-mode children (a non-null `parentId` is scrolled/expanded into
   * view without cached children) AND for flat virtual windows (`parentId`
   * null, `page` ≥ 2 scrolled into view). We resolve the consumer's promise and
   * hand the response back via `setFetchResponse`.
   *
   * The page handed to `setFetchResponse` is the *requested* `detail.page`, not
   * `response.page`: in flat-window mode the WC keys both its page cache and
   * its in-flight set on the requested page, so a server that normalises/echoes
   * a different page number would otherwise leave the placeholder unresolved
   * and the page stuck pending.
   */
  onFetchRequest(event: Event): void {
    const detail = (event as CustomEvent<TreeFetchRequestDetail>).detail;
    const fetcher = this.fetch();
    if (!fetcher) return;
    void (async () => {
      try {
        const response = await fetcher({
          page: detail.page,
          perPage: detail.perPage,
          sortColumns: detail.sortColumns as SortColumn[],
          parentId: detail.parentId ?? undefined,
        });
        const el = this.datatableRef()?.nativeElement;
        if (!el) return;
        el.setFetchResponse(detail.parentId, {
          data: response.data ?? [],
          totalRecords: response.totalRecords ?? response.data?.length ?? 0,
          page: detail.page,
          perPage: response.perPage ?? detail.perPage,
        });
      } catch (err) {
        // Surface failures to the consumer via the rowExpand event chain in a
        // future iteration. For v1 logging is sufficient to debug bad fetches.
        console.error('[bs-datatable] tree fetch failed', err);
      }
    })();
  }

  onRowExpand(event: Event): void {
    const detail = (event as CustomEvent<TreeRowExpandDetail<TData>>).detail;
    this.rowExpand.emit({ row: detail.row, depth: detail.depth, parentId: detail.parentId });
  }

  onRowCollapse(event: Event): void {
    const detail = (event as CustomEvent<TreeRowExpandDetail<TData>>).detail;
    this.rowCollapse.emit({ row: detail.row, depth: detail.depth, parentId: detail.parentId });
  }

  onExpandedIdsChange(event: Event): void {
    const detail = (event as CustomEvent<TreeExpandedIdsChangeDetail>).detail;
    const next = new Set(detail.expandedIds);
    if (setsEqual(this.expandedIds(), next)) return;
    this.expandedIds.set(next);
  }

  private toBsEvent(event: Event): BsDatatableRowEvent<TData> {
    const detail = (event as CustomEvent<RowEventDetail<TData>>).detail;
    return {
      row: detail.row,
      rowIndex: detail.rowIndex,
      rowKey: detail.rowKey,
      originalEvent: detail.originalEvent,
    };
  }
}

function setsEqual<T>(
  a: Set<T> | ReadonlyArray<T> | null | undefined,
  b: Set<T> | ReadonlyArray<T> | null | undefined,
): boolean {
  // In SSR the WC isn't upgraded yet, so reading `el.expandedIds` returns
  // `undefined` instead of the getter's `new Set()`. Treat both-missing as
  // equal so the sync effect short-circuits cleanly during pre-hydration.
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const aSize = a instanceof Set ? a.size : a.length;
  const bSize = b instanceof Set ? b.size : b.length;
  if (aSize !== bSize) return false;
  const bSet = b instanceof Set ? b : new Set(b);
  for (const v of a) if (!bSet.has(v)) return false;
  return true;
}

export { computeNextSort };
