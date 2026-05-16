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
} from '@mintplayer/ng-bootstrap/web-components/datatable';

// Side-effect import: registers <mp-datatable>.
import '@mintplayer/ng-bootstrap/web-components/datatable';

import { DatatableSettings } from '../datatable-settings';
import { BsDatatableFetch } from '../datatable-fetch';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { BsRowTemplateDirective, BsRowTemplateContext } from '../row-template/row-template.directive';

export interface BsDatatableRowEvent<T> {
  row: T;
  rowIndex: number;
  rowKey: string;
  originalEvent: Event;
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

    // Async fetch: re-run on fetch / settings changes. In virtual mode the
    // WC's virtualizer slices the in-memory `currentData` array, so the
    // wrapper drains every page from the fetcher up front. Per-viewport
    // on-demand fetching would need a sparse-array model in the WC.
    effect(() => {
      if (isPlatformServer(this.platformId)) return;
      const fetcher = this.fetch();
      if (!fetcher) return;
      const settings = this.settings();
      if (this.virtualScroll()) {
        void this.runVirtualFetchAll(fetcher, settings.sortColumns);
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
    return (row, rowIndex) => {
      if (row === undefined) return undefined;
      const key = this.rowKey()(row as TData, rowIndex);
      let viewRef = this.rowViews.get(key);
      if (!viewRef) {
        viewRef = this.vcr.createEmbeddedView(tpl.templateRef, { $implicit: row as TData, index: rowIndex });
        this.rowViews.set(key, viewRef);
      } else {
        viewRef.context.$implicit = row as TData;
        viewRef.context.index = rowIndex;
      }
      viewRef.detectChanges();
      // Filter to Node instances; <td> elements come through here.
      const nodes = viewRef.rootNodes.filter((n: unknown): n is Node => n instanceof Node);
      return nodes;
    };
  }

  /** Generation token: invalidates an in-flight virtual-mode preload when sort/fetcher changes. */
  private virtualFetchToken = 0;

  private async runVirtualFetchAll(
    fetcher: BsDatatableFetch<TData>,
    sortColumns: SortColumn[],
  ): Promise<void> {
    const token = ++this.virtualFetchToken;
    const perPage = 200;
    const first = await fetcher({ page: 1, perPage, sortColumns });
    if (!first || token !== this.virtualFetchToken) return;
    const accumulator: TData[] = [...(first.data ?? [])];
    const totalRecords = first.totalRecords ?? accumulator.length;
    const totalPages = Math.max(1, first.totalPages ?? Math.ceil(totalRecords / perPage));
    this.currentData.set(accumulator);
    this.totalRecords.set(totalRecords);
    const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    for (const page of remaining) {
      const response = await fetcher({ page, perPage, sortColumns });
      if (!response || token !== this.virtualFetchToken) return;
      accumulator.push(...(response.data ?? []));
      this.currentData.set([...accumulator]);
    }
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
    const idSet = new Set(detail.selectedIds);
    const keyFn = this.rowKey();
    const rows = this.currentData().filter((row, index) => idSet.has(keyFn(row, index)));
    this.selection.set(rows);
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

  onRowClick(event: Event): void {
    this.rowClick.emit(this.toBsEvent(event));
  }
  onRowDblClick(event: Event): void {
    this.rowDblClick.emit(this.toBsEvent(event));
  }
  onRowContextMenu(event: Event): void {
    this.rowContextMenu.emit(this.toBsEvent(event));
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

export { computeNextSort };
