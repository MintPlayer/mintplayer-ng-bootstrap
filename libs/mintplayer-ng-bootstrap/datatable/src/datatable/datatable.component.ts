import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, model, OnDestroy, signal, TemplateRef, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTableComponent, BsTableStylesComponent } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { DatatableSettings } from '../datatable-settings';
import { DatatableSortBase } from '../datatable-sort-base';
import { BsDatatableFetch } from '../datatable-fetch';
import { BsRowTemplateContext } from '../row-template/row-template.directive';

const VIRTUAL_PAGE_SIZE = 50; // viewport-driven page cache key size

@Component({
  selector: 'bs-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  imports: [NgTemplateOutlet, ScrollingModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTableComponent, BsTableStylesComponent, BsPaginationComponent, BsToggleButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDatatableComponent<TData> extends DatatableSortBase implements AfterViewInit, OnDestroy {

  private readonly elementRef = inject(ElementRef);
  private readonly cleanup: (() => void)[] = [];

  /** Single data contract — see docs/prd/datatable-virtual-merge-and-selection.md */
  fetch = input.required<BsDatatableFetch<TData>>();

  virtualScroll = input(false);
  itemSize = input(48);
  isResponsive = input(false);

  /** `'none'` hides the checkbox column; `'multiple'` is the canonical Vidyano case. */
  selectable = input<'none' | 'single' | 'multiple'>('none');

  /**
   * Identity function used across page/sort/scroll re-fetches. Required for
   * any non-`'none'` selection mode — the component does NOT try to infer
   * an id key. Default `Object.is` is reference-equality and won't survive
   * a refetch.
   */
  compareWith = input<(a: TData, b: TData) => boolean>(Object.is);

  selection = model<TData[]>([]);

  readonly rowTemplate = signal<TemplateRef<BsRowTemplateContext<TData>> | undefined>(undefined);

  /** Paginated mode: last fetch response. */
  protected readonly response = signal<PaginationResponse<TData> | undefined>(undefined);

  /** Virtual mode: page cache keyed by zero-based page index. */
  protected readonly virtualCache = signal<Map<number, TData[]>>(new Map());
  protected readonly virtualTotalRecords = signal(0);

  /**
   * Materialised `(TData | undefined)[]` of length `virtualTotalRecords()` —
   * uncached pages contribute `undefined` slots so cdkVirtualFor's scrollbar
   * stays accurate and placeholder rows render.
   */
  protected readonly virtualData = computed<readonly (TData | undefined)[]>(() => {
    const total = this.virtualTotalRecords();
    if (total === 0) return [];
    const cache = this.virtualCache();
    const result: (TData | undefined)[] = new Array(total);
    for (let i = 0; i < total; i++) {
      const pageIdx = Math.floor(i / VIRTUAL_PAGE_SIZE);
      const offset = i % VIRTUAL_PAGE_SIZE;
      result[i] = cache.get(pageIdx)?.[offset];
    }
    return result;
  });

  protected readonly numberOfColumns = computed(() => this.columns().length + (this.showCheckboxes() ? 1 : 0));
  protected readonly showCheckboxes = computed(() => this.selectable() !== 'none');
  protected readonly hasAnySelection = computed(() => this.selection().length > 0);
  /** aria-rowcount = total records + 1 (header). Paginated mode reports the slice. */
  protected readonly totalRowCount = computed(() =>
    this.virtualScroll() ? this.virtualTotalRecords() + 1 : (this.response()?.totalRecords ?? 0) + 1,
  );

  protected readonly viewport = viewChild(CdkVirtualScrollViewport);

  private pendingVirtualPages = new Set<number>();

  constructor() {
    super();

    // Paginated fetch — fires on settings or fetch-callback change.
    effect(() => {
      if (this.virtualScroll()) return;
      const fetch = this.fetch();
      const settings = this.settings();
      const req: PaginationRequest = {
        page: settings.page.selected,
        perPage: settings.perPage.selected,
        sortColumns: settings.sortColumns,
      };
      void this.runPaginatedFetch(fetch, req, settings);
    });

    // Virtual mode — reset cache when sort changes (or when switching INTO virtual mode).
    effect(() => {
      if (!this.virtualScroll()) return;
      const fetch = this.fetch();
      const settings = this.settings();
      // Reading sortColumns subscribes the effect to it.
      const sortKey = settings.sortColumns.map(c => `${c.property}:${c.direction}`).join(',');
      void this.resetAndPrimeVirtual(fetch, sortKey);
    });

    // Virtual mode — viewport range drives page fetches.
    effect((onCleanup) => {
      if (!this.virtualScroll()) return;
      const vp = this.viewport();
      if (!vp) return;
      const sub = vp.renderedRangeStream.subscribe((range) => {
        if (range.end <= range.start) return;
        this.ensurePagesForRange(range.start, range.end);
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  ngAfterViewInit() {
    // Virtual-mode-only DOM bookkeeping. Guards inside so they no-op when paginated.
    this.setupScrollSync();
    this.setupColumnWidthSync();
  }

  ngOnDestroy() {
    this.cleanup.forEach(fn => fn());
  }

  private async runPaginatedFetch(fetch: BsDatatableFetch<TData>, req: PaginationRequest, settings: DatatableSettings) {
    const response = await fetch(req);
    this.response.set(response);
    // Keep `settings.page.values` aligned with totalPages so the pagination UI
    // can render the right number of page chips. Only update if the count
    // actually changed to avoid a feedback loop with the settings effect.
    const desiredCount = Math.max(1, response.totalPages);
    if (settings.page.values.length !== desiredCount) {
      const updated = new DatatableSettings({
        ...settings,
        page: {
          values: Array.from({ length: desiredCount }, (_, i) => i + 1),
          selected: Math.min(settings.page.selected, desiredCount),
        },
      });
      this.settings.set(updated);
    }
  }

  private async resetAndPrimeVirtual(fetch: BsDatatableFetch<TData>, _sortKey: string) {
    // Reset state for the new sort/fetch.
    this.virtualCache.set(new Map());
    this.virtualTotalRecords.set(0);
    this.pendingVirtualPages.clear();
    // Prime page 0 so virtualTotalRecords is known before the viewport reports a range.
    await this.fetchVirtualPage(0, fetch);
  }

  private ensurePagesForRange(startIdx: number, endIdx: number) {
    const fetch = this.fetch();
    const startPage = Math.floor(startIdx / VIRTUAL_PAGE_SIZE);
    const endPage = Math.floor(Math.max(0, endIdx - 1) / VIRTUAL_PAGE_SIZE);
    const cache = this.virtualCache();
    for (let p = startPage; p <= endPage; p++) {
      if (!cache.has(p) && !this.pendingVirtualPages.has(p)) {
        void this.fetchVirtualPage(p, fetch);
      }
    }
  }

  private async fetchVirtualPage(pageIdx: number, fetch: BsDatatableFetch<TData>) {
    this.pendingVirtualPages.add(pageIdx);
    try {
      const response = await fetch({
        page: pageIdx + 1,
        perPage: VIRTUAL_PAGE_SIZE,
        sortColumns: this.settings().sortColumns,
      });
      const next = new Map(this.virtualCache());
      next.set(pageIdx, response.data);
      this.virtualCache.set(next);
      this.virtualTotalRecords.set(response.totalRecords);
    } finally {
      this.pendingVirtualPages.delete(pageIdx);
    }
  }

  // === Selection ===

  isSelected(row: TData): boolean {
    if (row === undefined || row === null) return false;
    const cmp = this.compareWith();
    return this.selection().some(s => cmp(s, row));
  }

  toggleRow(row: TData, checked: boolean) {
    if (row === undefined || row === null) return;
    const cmp = this.compareWith();
    const current = this.selection();
    if (checked) {
      if (this.selectable() === 'single') {
        this.selection.set([row]);
      } else {
        // Replace any prior entry under the same identity, then append the
        // most-recently-seen object reference.
        this.selection.set([...current.filter(s => !cmp(s, row)), row]);
      }
    } else {
      this.selection.set(current.filter(s => !cmp(s, row)));
    }
  }

  deselectAll() {
    this.selection.set([]);
  }

  /** Called by the deselect-all toggle in the header. The toggle is bound
   *  `[isToggled]="hasAnySelection()"`, so model writes also fire this
   *  event — only the `false` transition is a user-driven deselect. */
  protected onDeselectAllToggled(value: boolean | null) {
    if (value === false) {
      this.deselectAll();
    }
  }

  // === Paginated mode UI handlers ===

  onPerPageChange(perPage: number) {
    const currentSettings = this.settings();
    this.settings.set(new DatatableSettings({
      ...currentSettings,
      perPage: { ...currentSettings.perPage, selected: perPage },
      page: { ...currentSettings.page, selected: 1 },
    }));
  }

  onPageChange(page: number) {
    const currentSettings = this.settings();
    this.settings.set(new DatatableSettings({
      ...currentSettings,
      page: { ...currentSettings.page, selected: page },
    }));
  }

  // === Virtual mode DOM bookkeeping (carried over from old BsVirtualDatatableComponent) ===
  //
  // The virtual viewport renders body rows into its own <table>, separate from
  // the sticky header <table> in `bs-table`. Two helpers keep them in lockstep:
  //  - setupScrollSync: horizontal scroll on either table mirrors the other.
  //  - setupColumnWidthSync: measures content widths after each cdkVirtualFor
  //    swap and pins min-widths so header and body columns line up.

  private setupScrollSync() {
    const el = this.elementRef.nativeElement as HTMLElement;
    const headerScrollContainer = el.querySelector('.table-responsive') as HTMLElement | null;
    const viewport = el.querySelector('cdk-virtual-scroll-viewport') as HTMLElement | null;
    if (!headerScrollContainer || !viewport) return;

    let syncing = false;
    const onHeaderScroll = () => {
      if (syncing) return;
      syncing = true;
      viewport.scrollLeft = headerScrollContainer.scrollLeft;
      syncing = false;
    };
    const onViewportScroll = () => {
      if (syncing) return;
      syncing = true;
      headerScrollContainer.scrollLeft = viewport.scrollLeft;
      syncing = false;
    };
    headerScrollContainer.addEventListener('scroll', onHeaderScroll, { passive: true });
    viewport.addEventListener('scroll', onViewportScroll, { passive: true });
    this.cleanup.push(() => {
      headerScrollContainer.removeEventListener('scroll', onHeaderScroll);
      viewport.removeEventListener('scroll', onViewportScroll);
    });
  }

  private setupColumnWidthSync() {
    const el = this.elementRef.nativeElement as HTMLElement;
    const bodyTableBody = el.querySelector('cdk-virtual-scroll-viewport tbody') as HTMLElement | null;
    if (!bodyTableBody) return;

    const maxWidths: number[] = [];

    const syncWidths = () => {
      const headerCells = el.querySelectorAll<HTMLElement>('bs-table thead th');
      const allBodyRows = Array.from(bodyTableBody.querySelectorAll<HTMLTableRowElement>('tr'));
      const firstBodyRow = allBodyRows[0];
      const bodyCells = firstBodyRow?.cells;
      if (!headerCells.length || !bodyCells?.length) return;
      const columnCount = Math.min(headerCells.length, bodyCells.length);

      const headerScrollContainer = el.querySelector('.table-responsive') as HTMLElement | null;
      const viewport = el.querySelector('cdk-virtual-scroll-viewport') as HTMLElement | null;
      const savedHeaderScroll = headerScrollContainer?.scrollLeft ?? 0;
      const savedViewportScroll = viewport?.scrollLeft ?? 0;

      for (const row of allBodyRows) {
        const tds = row.cells;
        for (let i = 0; i < Math.min(tds.length, columnCount); i++) tds[i].style.minWidth = '';
      }
      for (let i = 0; i < columnCount; i++) headerCells[i].style.minWidth = '';

      const headerTable = el.querySelector<HTMLElement>('bs-table table');
      const bodyTable = el.querySelector<HTMLElement>('cdk-virtual-scroll-viewport table');
      headerTable?.style.setProperty('width', 'max-content', 'important');
      bodyTable?.style.setProperty('width', 'max-content', 'important');

      for (let i = 0; i < columnCount; i++) {
        let colWidth = headerCells[i].offsetWidth;
        for (const row of allBodyRows) {
          const tds = row.cells;
          if (i < tds.length) {
            const w = tds[i].offsetWidth;
            if (w > colWidth) colWidth = w;
          }
        }
        if (!maxWidths[i] || colWidth > maxWidths[i]) maxWidths[i] = colWidth;
      }

      headerTable?.style.removeProperty('width');
      bodyTable?.style.removeProperty('width');

      for (let i = 0; i < columnCount; i++) {
        const w = `${maxWidths[i]}px`;
        headerCells[i].style.minWidth = w;
        for (const row of allBodyRows) {
          const tds = row.cells;
          if (i < tds.length) tds[i].style.minWidth = w;
        }
      }

      if (headerScrollContainer) headerScrollContainer.scrollLeft = savedHeaderScroll;
      if (viewport) viewport.scrollLeft = savedViewportScroll;
    };

    requestAnimationFrame(() => syncWidths());

    const observer = new MutationObserver(() => requestAnimationFrame(() => syncWidths()));
    observer.observe(bodyTableBody, { childList: true, subtree: true });
    this.cleanup.push(() => observer.disconnect());
  }

}
