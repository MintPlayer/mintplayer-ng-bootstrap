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
  type ViewRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
  type WritableSignal,
  ViewContainerRef,
  viewChild,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { SortColumn } from '@mintplayer/pagination';
import {
  computeNextSort,
  type DatatableColumnDef,
  type DatatableDistincts,
  type DatatableLabels,
  type DatatableSelectionMode,
  type DistinctValues,
  type FilterChangeDetail,
  type MpDatatable,
  type RowEventDetail,
  type RowRenderer,
  type SortChangeEventDetail,
  type SelectionChangeEventDetail,
  type TreeRowExpandDetail,
  type TreeExpandedIdsChangeDetail,
  type TreeIdKey,
  type TreeSelectionStrategy,
} from '@mintplayer/web-components/datatable';

// Side-effect import: registers <mp-datatable>.
import '@mintplayer/web-components/datatable';

import { DatatableSettings } from '../datatable-settings';
import { BsDatatableFetch } from '../datatable-fetch';
import {
  BsDatatableColumnDirective,
  type BsDatatableFilterPanelContext,
} from '../datatable-column/datatable-column.directive';
import { BsRowTemplateDirective, BsRowTemplateContext } from '../row-template/row-template.directive';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

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
  imports: [BsForwardAriaDirective],
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

  /**
   * The **complete** row set. Use `[fetch]` for server-side pagination.
   *
   * "Complete" matters to the filter panels: their value lists are computed from
   * this array, so a consumer who pages `[data]` themselves is showing the
   * component one page and will get a value list covering one page. That case
   * needs `[distincts]`.
   */
  readonly data = input<TData[] | null>(null);

  /** Async data loader (server-side pagination). Mutually exclusive with `[data]`. */
  readonly fetch = input<BsDatatableFetch<TData> | null>(null);

  /**
   * Source of distinct values for the filter panels.
   *
   * Required whenever the component does not hold every row — with `[fetch]`,
   * with external paging, or with a tree whose children are loaded on demand, a
   * locally computed list would silently omit values, so it is not computed at
   * all. Resolve `null` for a column to hand that one column back to the local
   * path.
   */
  readonly distincts = input<DatatableDistincts | null>(null);

  /** Partial override of the component's user-visible strings. */
  readonly labels = input<Partial<DatatableLabels> | null>(null);

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

  /**
   * Emitted whenever a column's filter selection changes, including when it is
   * cleared (`selected: []`).
   *
   * The component does not filter `[data]`: acting on this — and setting
   * `filterActive` / `filterSummary` back on the column — is the consumer's job,
   * because only they know whether the filter is client-side or a new query.
   */
  readonly filterChange = output<FilterChangeDetail>();

  readonly datatableRef = viewChild<ElementRef<MpDatatable>>('datatable');

  /** Column directives (header template + sortable). Wrapper-level discovery. */
  readonly columnDirectives = contentChildren(BsDatatableColumnDirective);

  /** Optional row template. When present, drives a per-row EmbeddedView render path. */
  readonly rowTemplate = contentChild(BsRowTemplateDirective<TData>);

  /**
   * Merged column defs:
   *  - `[columns]` if provided
   *  - else the `*bsDatatableColumn` directives mapped onto column defs whose
   *    `headerRenderer` returns a DOM node produced from the directive's template.
   */
  protected readonly effectiveColumns = computed<DatatableColumnDef<TData>[]>(() => {
    const programmatic = this.columnsInput();
    if (programmatic && programmatic.length) return programmatic;

    // Every recompute builds fresh closures with fresh views, so the previous
    // generation is dead the moment we return. Without retiring them they
    // accumulated until the component was destroyed — harmless-looking with one
    // view per column, twice as bad now that filters add a second.
    //
    // Retired, not destroyed: see `retireTemplateViews`. Destroying here is
    // NG0600.
    this.retireTemplateViews();

    return this.columnDirectives().map((dir): DatatableColumnDef<TData> => {
      let headerView: EmbeddedViewRef<unknown> | undefined;
      let filterView: EmbeddedViewRef<BsDatatableFilterPanelContext> | undefined;
      let filterValues: WritableSignal<DistinctValues | null> | undefined;
      return {
        name: dir.name(),
        sortable: dir.sortable(),
        filterable: dir.filterable(),
        filterActive: dir.filterActive(),
        filterSummary: dir.filterSummary(),
        filterSelection: dir.filterSelection(),
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
        // Installed UNCONDITIONALLY, and the nested template is resolved inside
        // it rather than out here.
        //
        // `dir.filterPanelTemplate` is assigned by the nested directive's
        // constructor, which does not run until the column's header view is
        // created — too late for this computed's first evaluation. Reading it
        // here would see `undefined` for every column and no override would ever
        // appear. Creating the header view eagerly to force it is worse: the
        // insertion dirties Angular's query signals inside a reactive read, and
        // that throws NG0600 as soon as the host declares any `viewChild`.
        //
        // Returning `null` means "use the built-in panel", so a column with no
        // override costs nothing.
        filterRenderer: (_col, ctx) => {
          const tpl = dir.filterPanelTemplate;
          if (!tpl) return null;
          if (!filterView || !filterValues) {
            // The context is a signal because the demos and specs are zoneless:
            // mutating a context object notifies nothing, so the override would
            // never repaint as values load.
            filterValues = signal(ctx.values());
            filterView = this.vcr.createEmbeddedView(tpl, { $implicit: filterValues, ctx });
            this.filterViews.push(filterView);
            const values = filterValues;
            this.filterUnsubscribes.push(ctx.onChange(() => values.set(ctx.values())));
          }
          filterView.detectChanges();
          const nodes = filterView.rootNodes.filter((n: unknown): n is Node => n instanceof Node);
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
  /** EmbeddedViews for filter panel templates (one per overriding column). */
  private filterViews: EmbeddedViewRef<BsDatatableFilterPanelContext>[] = [];
  /** `FilterContext.onChange` unsubscribes, one per live filter view. */
  private filterUnsubscribes: (() => void)[] = [];

  /** The previous generation, awaiting disposal by the columns effect. */
  private staleViews: ViewRef[] = [];

  /**
   * Hands the previous generation over for disposal — it does **not** destroy
   * anything, and must not.
   *
   * This runs inside `effectiveColumns`, and destroying a view detaches it,
   * which dirties Angular's query signals: a signal write inside a computed,
   * i.e. NG0600, the moment the host declares any view query. It is the exact
   * mirror of why views are not CREATED here either — attach and detach are
   * both signal writes, so neither belongs in a computed.
   *
   * Handing over is a plain field write, and the effect that forwards the
   * columns disposes the batch on the same tick, so the leak this replaced
   * stays fixed: at most one dead generation exists, and only momentarily.
   */
  private retireTemplateViews(): void {
    this.staleViews.push(...this.headerViews, ...this.filterViews);
    this.headerViews = [];
    this.filterViews = [];
    this.releaseFilterSubscriptions();
  }

  /** Destroys the retired generation. Only ever called from an effect. */
  private disposeStaleViews(): void {
    for (const v of this.staleViews) v.destroy();
    this.staleViews = [];
  }

  /**
   * Without this the web component keeps calling into a destroyed view's signal
   * on every value change, for the life of the element.
   */
  private releaseFilterSubscriptions(): void {
    for (const unsubscribe of this.filterUnsubscribes) unsubscribe();
    this.filterUnsubscribes = [];
  }
  /** EmbeddedViews for row templates, keyed by rowKey for reuse. */
  private rowViews = new Map<string, EmbeddedViewRef<BsRowTemplateContext<TData>>>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      // Deliberately does NOT destroy the views. Every one of them is attached
      // to this component's ViewContainerRef, so Angular tears them down with
      // the host view; destroying them again from a cleanup hook re-enters that
      // teardown and desynchronises the container's view bookkeeping — a hard
      // "attached view should be in the same position within its container"
      // assertion in dev mode. It only surfaces once a header template contains
      // a nested structural directive, which `*bsDatatableFilterPanel` is, so
      // the previous code looked correct right up until it was not.
      //
      // The subscriptions are the only thing here Angular knows nothing about.
      this.releaseFilterSubscriptions();
      this.headerViews = [];
      this.filterViews = [];
      this.staleViews = [];
      this.rowViews.clear();
    });

    // Forward the `[fetch]` callback to the WC, which owns the entire
    // server-paged loop (initial page, on-demand windows, tree children,
    // pagination, sort/perPage reloads) and derives `totalRecords` from the
    // response. The wrapper no longer runs any fetch loop. Skipped on the
    // server so SSR doesn't kick off a client fetch.
    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      if (isPlatformServer(this.platformId)) return;
      el.fetch = (this.fetch() as unknown as MpDatatable['fetch']) ?? null;
    });

    // Same server guard as `fetch`: the source is a network call in every real
    // consumer, and a panel cannot be opened during SSR anyway.
    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      if (isPlatformServer(this.platformId)) return;
      el.distincts = this.distincts();
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.labels = this.labels() ?? undefined;
    });

    // Forward columns to the WC, and dispose the generation the recompute
    // retired. An effect may write signals; a computed may not, which is the
    // whole reason the disposal happens out here.
    effect(() => {
      const columns = this.effectiveColumns();
      this.disposeStaleViews();
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.columns = columns as DatatableColumnDef[];
    });

    // Static `[data]` only. When `[fetch]` is set the WC owns the rows, so the
    // wrapper must not also push `el.data` (it would clobber fetched pages).
    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      if (this.fetch()) return;
      const d = this.data();
      el.data = (d ?? []) as unknown[];
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
    const detail = (event as CustomEvent<SelectionChangeEventDetail<TData>>).detail;
    // The WC owns the data and resolves ids → row objects itself (across page 1,
    // fetched windows, and tree children), so we take the rows straight from the
    // event — no wrapper-side row bookkeeping.
    this.selection.set([...detail.selectedRows]);
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

  onFilterChange(event: Event): void {
    this.filterChange.emit((event as CustomEvent<FilterChangeDetail>).detail);
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
