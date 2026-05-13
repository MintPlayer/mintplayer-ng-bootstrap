import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, model, signal, TemplateRef, untracked, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTableComponent, BsTableStylesComponent } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { DatatableSettings } from '../datatable-settings';
import { DatatableSortBase } from '../datatable-sort-base';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
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
export class BsDatatableComponent<TData> extends DatatableSortBase implements AfterViewInit {

  private readonly elementRef = inject(ElementRef);

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

  /** Show the per-column resize handle and run the measure-once auto-sizer
   *  on first batch. False = legacy fluid layout, no widths pinned. */
  resizableColumns = input(true);

  /** Floor for drag-resize and keyboard-resize, in px. */
  minColumnWidth = input(40);

  selection = model<TData[]>([]);

  /**
   * Per-column pinned width in px, keyed by `BsDatatableColumnDirective.name()`.
   * Source of truth for the measure-once + freeze model: a column with an
   * entry here is "locked" (either auto-sized on first batch, or user-set
   * via drag / dblclick / keyboard). Columns absent from the map are still
   * "Pristine" — the next initial-auto-size pass will fill them in.
   * See docs/prd/datatable-virtual-merge-and-selection.md § Resizable columns.
   */
  protected readonly columnWidths = signal<ReadonlyMap<string, number>>(new Map());

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

    // Re-wire scroll sync + column-width re-apply whenever virtual mode is
    // active. The viewport DOM doesn't exist until @if (virtualScroll())
    // renders, so ngAfterViewInit's one-shot setup can't see it on mode
    // toggles (or on the initial paginated → virtual flip). Each effect
    // run is scoped: listeners are torn down when virtual mode flips off.
    effect((onCleanup) => {
      if (!this.virtualScroll()) return;

      const teardowns: (() => void)[] = [];
      let cancelled = false;

      // Defer one frame so Angular has rendered the cdk viewport + table.
      const rafId = requestAnimationFrame(() => {
        if (cancelled) return;
        this.setupScrollSync(teardowns);
        this.setupColumnApply(teardowns);
        // If we have pinned widths from a previous mode, re-apply them to
        // the freshly-mounted virtual table.
        if (this.columnWidths().size > 0) {
          this.applyAllColumnWidths();
        }
      });

      onCleanup(() => {
        cancelled = true;
        cancelAnimationFrame(rafId);
        teardowns.forEach(fn => fn());
      });
    });

    // Initial auto-size: after the first non-empty batch lands, measure each
    // unsized column and pin its width. Re-runs on data signal changes but
    // short-circuits once every column has an entry in columnWidths.
    effect(() => {
      if (!this.resizableColumns()) return;
      const hasData = this.virtualScroll()
        ? this.virtualCache().size > 0 && this.virtualTotalRecords() > 0
        : (this.response()?.data?.length ?? 0) > 0;
      if (!hasData) return;
      untracked(() => {
        const unsized = this.columns().filter(c => !this.columnWidths().has(c.name()));
        if (unsized.length === 0) return;
        // Wait one frame so the rows are committed to the DOM before measuring.
        requestAnimationFrame(() => this.runInitialAutoSize());
      });
    });
  }

  ngAfterViewInit() {
    // No-op for the dynamic case: virtual sync is wired by the effect
    // above whenever virtualScroll() is true. Left as a hook in case
    // future paginated-mode bookkeeping needs ngAfterViewInit timing.
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

  // === Virtual mode DOM bookkeeping ===
  //
  // The virtual viewport renders body rows into its own <table>, separate
  // from the sticky header <table> in `bs-table`. Two helpers keep them in
  // lockstep:
  //  - setupScrollSync: horizontal scroll on either table mirrors the other.
  //  - setupColumnApply: re-applies pinned widths from `columnWidths` to
  //    body rows after each cdkVirtualFor recycle (the inline minWidths are
  //    lost when a row is removed and a new one mounted in its slot).
  //
  // The actual *measurement* of widths is one-shot (see the initial-auto-
  // size effect in the constructor + `runInitialAutoSize`). After that,
  // widths only change on user input (drag, dblclick, keyboard).

  private setupScrollSync(teardowns: (() => void)[]) {
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
    teardowns.push(() => {
      headerScrollContainer.removeEventListener('scroll', onHeaderScroll);
      viewport.removeEventListener('scroll', onViewportScroll);
    });
  }

  /** Re-apply pinned widths from `columnWidths` to body rows whenever the
   *  cdkVirtualFor recycles a row (new <tr> in an existing slot starts with
   *  no inline minWidth). */
  private setupColumnApply(teardowns: (() => void)[]) {
    const el = this.elementRef.nativeElement as HTMLElement;
    const bodyTableBody = el.querySelector('cdk-virtual-scroll-viewport tbody') as HTMLElement | null;
    if (!bodyTableBody) return;

    const observer = new MutationObserver(() => {
      if (this.columnWidths().size === 0) return;
      requestAnimationFrame(() => this.applyAllColumnWidths());
    });
    observer.observe(bodyTableBody, { childList: true });
    teardowns.push(() => observer.disconnect());
  }

  // === Resizable columns: measurement, apply, and user gestures ===

  /** Cell index in the table for `column` — selection column shifts indices by 1. */
  private cellIndexFor(column: BsDatatableColumnDirective): number {
    const idx = this.columns().findIndex(c => c === column);
    if (idx === -1) return -1;
    return idx + (this.showCheckboxes() ? 1 : 0);
  }

  /** Same as cellIndexFor but keyed by name. */
  private cellIndexForName(name: string): number {
    const idx = this.columns().findIndex(c => c.name() === name);
    if (idx === -1) return -1;
    return idx + (this.showCheckboxes() ? 1 : 0);
  }

  /** Measure the natural max(header, …visible td) widths for the named
   *  columns in one DOM pass. Uses the `width: max-content !important`
   *  override to defeat Bootstrap's `width: 100%`. Returns a Map. */
  private measureWidths(names: string[]): Map<string, number> {
    const el = this.elementRef.nativeElement as HTMLElement;
    const headerCells = el.querySelectorAll<HTMLElement>('bs-table thead th');
    const bodyContainerSel = this.virtualScroll()
      ? 'cdk-virtual-scroll-viewport'
      : 'bs-datatable bs-table';
    const bodyRows = Array.from(
      el.querySelectorAll<HTMLTableRowElement>(`${bodyContainerSel} tbody tr`),
    );
    if (!headerCells.length || !bodyRows.length) return new Map();

    const indices = names
      .map(name => ({ name, idx: this.cellIndexForName(name) }))
      .filter(({ idx }) => idx >= 0 && idx < headerCells.length);
    if (indices.length === 0) return new Map();

    const headerScrollContainer = el.querySelector('.table-responsive') as HTMLElement | null;
    const viewport = el.querySelector('cdk-virtual-scroll-viewport') as HTMLElement | null;
    const savedHeaderScroll = headerScrollContainer?.scrollLeft ?? 0;
    const savedViewportScroll = viewport?.scrollLeft ?? 0;

    // Snapshot + clear inline width / min-width / max-width on the cells
    // we're about to measure so the natural width is observable. We restore
    // them after.
    const restore: Array<() => void> = [];
    const clearCell = (cell: HTMLElement) => {
      const prev = { w: cell.style.width, mn: cell.style.minWidth, mx: cell.style.maxWidth };
      cell.style.width = '';
      cell.style.minWidth = '';
      cell.style.maxWidth = '';
      restore.push(() => {
        cell.style.width = prev.w;
        cell.style.minWidth = prev.mn;
        cell.style.maxWidth = prev.mx;
      });
    };
    for (const { idx } of indices) {
      const th = headerCells[idx];
      if (th) clearCell(th);
      for (const row of bodyRows) {
        const td = row.children[idx] as HTMLElement | undefined;
        if (td) clearCell(td);
      }
    }

    const headerTable = el.querySelector<HTMLElement>('bs-table table');
    const bodyTable = el.querySelector<HTMLElement>(`${bodyContainerSel} table`);
    headerTable?.style.setProperty('width', 'max-content', 'important');
    bodyTable?.style.setProperty('width', 'max-content', 'important');

    const result = new Map<string, number>();
    const floor = this.minColumnWidth();
    for (const { name, idx } of indices) {
      let max = headerCells[idx].offsetWidth;
      for (const row of bodyRows) {
        const td = row.children[idx] as HTMLElement | undefined;
        if (td && td.offsetWidth > max) max = td.offsetWidth;
      }
      result.set(name, Math.max(floor, max));
    }

    headerTable?.style.removeProperty('width');
    bodyTable?.style.removeProperty('width');
    for (const fn of restore) fn();
    if (headerScrollContainer) headerScrollContainer.scrollLeft = savedHeaderScroll;
    if (viewport) viewport.scrollLeft = savedViewportScroll;

    return result;
  }

  /** Run the initial measure pass on every column that isn't sized yet. */
  private runInitialAutoSize() {
    const unsized = this.columns()
      .map(c => c.name())
      .filter(name => !this.columnWidths().has(name));
    if (unsized.length === 0) return;
    const measured = this.measureWidths(unsized);
    if (measured.size === 0) return;
    const next = new Map(this.columnWidths());
    measured.forEach((w, name) => next.set(name, w));
    this.columnWidths.set(next);
    this.applyAllColumnWidths();
  }

  /** Write `width` (not min-width) on header + every visible td so that
   *  table-layout: fixed pins the column exactly to the locked value,
   *  even when the body cell's content is wider than the user-chosen
   *  width. Combined with overflow:hidden on the cell, longer content
   *  clips — that's the intended freeze semantics. */
  private applyColumnWidth(name: string) {
    const idx = this.cellIndexForName(name);
    if (idx < 0) return;
    const w = this.columnWidths().get(name);
    if (w === undefined) return;
    const px = `${w}px`;
    const el = this.elementRef.nativeElement as HTMLElement;
    const headerCells = el.querySelectorAll<HTMLElement>('bs-table thead th');
    const headerCell = headerCells[idx];
    if (headerCell) {
      headerCell.style.width = px;
      headerCell.style.minWidth = px;
      headerCell.style.maxWidth = px;
    }
    const bodyContainerSel = this.virtualScroll()
      ? 'cdk-virtual-scroll-viewport'
      : 'bs-datatable bs-table';
    const bodyRows = el.querySelectorAll<HTMLTableRowElement>(`${bodyContainerSel} tbody tr`);
    bodyRows.forEach(row => {
      const td = row.children[idx] as HTMLElement | undefined;
      if (!td) return;
      td.style.width = px;
      td.style.minWidth = px;
      td.style.maxWidth = px;
    });
  }

  private applyAllColumnWidths() {
    for (const name of this.columnWidths().keys()) {
      this.applyColumnWidth(name);
    }
  }

  /** Commit a new width for `name` into the signal and write it to the DOM. */
  private commitColumnWidth(name: string, w: number) {
    const next = new Map(this.columnWidths());
    next.set(name, w);
    this.columnWidths.set(next);
    this.applyColumnWidth(name);
  }

  // === Pointer / keyboard handlers used by the template ===

  /** Click on the handle must not bubble to the <th>'s sort handler. */
  protected onResizeHandleClick(event: MouseEvent) {
    event.stopPropagation();
  }

  protected onResizeHandlePointerDown(event: PointerEvent, column: BsDatatableColumnDirective) {
    if (!this.resizableColumns()) return;
    // Don't let the underlying <th>'s sort handler see this gesture.
    event.stopPropagation();
    // Per feedback_pointerdown_preventdefault: do NOT preventDefault() on
    // touch pointerdown — it suppresses the synthesised click chain.
    const handle = event.target as HTMLElement;
    handle.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const name = column.name();
    const startWidth = this.columnWidths().get(name)
      ?? this.measureWidths([name]).get(name)
      ?? this.minColumnWidth();

    let pending = startWidth;
    let rafId: number | null = null;
    const flush = () => {
      rafId = null;
      this.commitColumnWidth(name, pending);
    };

    const onMove = (e: PointerEvent) => {
      pending = Math.max(this.minColumnWidth(), startWidth + (e.clientX - startX));
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    const onEnd = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      this.commitColumnWidth(name, pending);
      handle.releasePointerCapture(event.pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  }

  protected onResizeHandleDoubleClick(event: MouseEvent, column: BsDatatableColumnDirective) {
    event.stopPropagation();
    if (!this.resizableColumns()) return;
    const name = column.name();
    const measured = this.measureWidths([name]).get(name);
    if (measured !== undefined) {
      this.commitColumnWidth(name, Math.max(this.minColumnWidth(), measured));
    }
  }

  protected onResizeHandleKeydown(event: KeyboardEvent, column: BsDatatableColumnDirective) {
    if (!this.resizableColumns()) return;

    // Enter / Space are no-ops on the handle — but the underlying <th>'s
    // (keydown.enter|space) handler would trigger a sort if we let them
    // bubble. Consume them so the handle is a real focus stop.
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const name = column.name();
    const current = this.columnWidths().get(name) ?? this.measureWidths([name]).get(name) ?? this.minColumnWidth();
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowLeft':  next = current - (event.shiftKey ? 1 : 10); break;
      case 'ArrowRight': next = current + (event.shiftKey ? 1 : 10); break;
      case 'Home': {
        const measured = this.measureWidths([name]).get(name);
        if (measured !== undefined) next = measured;
        break;
      }
    }
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    this.commitColumnWidth(name, Math.max(this.minColumnWidth(), next));
  }

}
