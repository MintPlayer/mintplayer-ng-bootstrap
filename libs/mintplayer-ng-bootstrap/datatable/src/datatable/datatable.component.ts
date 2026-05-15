import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
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
  type SortChangeEventDetail,
  type SelectionChangeEventDetail,
} from '@mintplayer/ng-bootstrap/web-components/datatable';

// Side-effect import: registers <mp-datatable>.
import '@mintplayer/ng-bootstrap/web-components/datatable';

import { DatatableSettings } from '../datatable-settings';
import { BsDatatableFetch } from '../datatable-fetch';

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

  /** Programmatic column list. The directive-based API has been removed. */
  readonly columns = input.required<DatatableColumnDef<TData>[]>();

  /** Static (already-paginated) data array. Use `[fetch]` for server-side pagination. */
  readonly data = input<TData[] | null>(null);

  /** Async data loader (server-side pagination). Mutually exclusive with `[data]`. */
  readonly fetch = input<BsDatatableFetch<TData> | null>(null);

  /** Two-way bound pagination / sort settings. */
  readonly settings = model<DatatableSettings>(new DatatableSettings());

  /** `'none'` hides selection; `'multiple'` shows checkboxes. */
  readonly selectionMode = input<DatatableSelectionMode>('none');

  /** Two-way bound array of selected rows (identity via `rowKey`). */
  readonly selection = model<TData[]>([]);

  /** Required for selection / async refetch identity. Default `String((row as any).id)`. */
  readonly rowKey = input<(row: TData, index: number) => string>((row: TData, index: number) => {
    const r = row as { id?: unknown } | null;
    return r && r.id != null ? String(r.id) : `row-${index}`;
  });

  /** Drag-resize column widths. Default `true`. */
  readonly resizableColumns = input<boolean>(true);

  /** Show the resizable footer pagination UI. Default `true` for sync data, ignored when fetch is provided (paginated externally). */
  readonly pagination = input<boolean>(true);

  /** Emitted on row single-click. */
  readonly rowClick = output<BsDatatableRowEvent<TData>>();
  /** Emitted on row double-click. */
  readonly rowDblClick = output<BsDatatableRowEvent<TData>>();
  /** Emitted on row context-menu. */
  readonly rowContextMenu = output<BsDatatableRowEvent<TData>>();

  readonly datatableRef = viewChild<ElementRef<MpDatatable>>('datatable');

  /** Internal data source — populated either from `data()` or from `fetch()` responses. */
  protected readonly currentData = signal<TData[]>([]);
  protected readonly totalRecords = signal<number>(0);

  constructor() {
    // Sync data input → internal source.
    effect(() => {
      const d = this.data();
      if (d !== null) {
        this.currentData.set(d);
        this.totalRecords.set(d.length);
      }
    });

    // Async fetch: re-run on fetch / settings changes.
    effect(() => {
      if (isPlatformServer(this.platformId)) return;
      const fetcher = this.fetch();
      if (!fetcher) return;
      const settings = this.settings();
      const req: PaginationRequest = {
        page: settings.page.selected,
        perPage: settings.perPage.selected,
        sortColumns: settings.sortColumns,
      };
      void this.runFetch(fetcher, req, settings);
    });

    // Forward properties to the WC.
    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.columns = this.columns() as DatatableColumnDef[];
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.data = this.currentData() as unknown[];
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      const settings = this.settings();
      el.sortColumns = settings.sortColumns.map((c) => ({ property: c.property, direction: c.direction }));
      // When using fetch, the WC must NOT also sort or paginate — that's the consumer's job.
      el.autoSort = !this.fetch();
      el.pagination = this.pagination() && !this.fetch();
      el.page = settings.page.selected;
      el.perPage = settings.perPage.selected;
      el.perPageOptions = settings.perPage.values;
    });

    effect(() => {
      const el = this.datatableRef()?.nativeElement;
      if (!el) return;
      el.selectionMode = this.selectionMode();
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

  private async runFetch(
    fetcher: BsDatatableFetch<TData>,
    req: PaginationRequest,
    settings: DatatableSettings,
  ): Promise<void> {
    const response = await fetcher(req);
    if (!response) return;
    this.currentData.set(response.data ?? []);
    this.totalRecords.set(response.totalRecords ?? response.data?.length ?? 0);

    // Update page options to match totalPages.
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
        // Reset to page 1 on sort change (matches existing behavior).
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
