import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, input, OnDestroy, signal, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { BsTableComponent, BsTableStylesComponent } from '@mintplayer/ng-bootstrap/table';
import { DatatableSortBase } from '@mintplayer/ng-bootstrap/datatable';
import { VirtualDatatableDataSource } from '../virtual-datatable-data-source';
import { BsVirtualRowTemplateContext } from '../virtual-row-template/virtual-row-template.directive';

@Component({
  selector: 'bs-virtual-datatable',
  templateUrl: './virtual-datatable.component.html',
  styleUrls: ['./virtual-datatable.component.scss'],
  imports: [NgTemplateOutlet, ScrollingModule, BsTableComponent, BsTableStylesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsVirtualDatatableComponent<TData> extends DatatableSortBase implements AfterViewInit, OnDestroy {

  private readonly elementRef = inject(ElementRef);
  private cleanup: (() => void)[] = [];

  dataSource = input.required<VirtualDatatableDataSource<TData>>();
  isResponsive = input(false);
  itemSize = input(48);

  readonly rowTemplate = signal<TemplateRef<BsVirtualRowTemplateContext<TData>> | undefined>(undefined);

  ngAfterViewInit() {
    this.setupScrollSync();
    this.setupColumnWidthSync();
  }

  ngOnDestroy() {
    this.cleanup.forEach(fn => fn());
  }

  private setupScrollSync() {
    const el = this.elementRef.nativeElement as HTMLElement;
    const headerScrollContainer = el.querySelector('.table-responsive') as HTMLElement;
    const viewport = el.querySelector('cdk-virtual-scroll-viewport') as HTMLElement;

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
    const bodyTableBody = el.querySelector('cdk-virtual-scroll-viewport tbody') as HTMLElement;

    if (!bodyTableBody) return;

    // Track the max width seen for each column so columns only grow, never
    // shrink (prevents layout jumps as rows scroll in/out of view).
    const maxWidths: number[] = [];

    const syncWidths = () => {
      const headerCells = el.querySelectorAll<HTMLElement>('bs-table thead th');
      const allBodyRows = Array.from(bodyTableBody.querySelectorAll<HTMLTableRowElement>('tr'));
      const firstBodyRow = allBodyRows[0];
      const bodyCells = firstBodyRow?.cells;

      if (!headerCells.length || !bodyCells?.length) return;

      const columnCount = Math.min(headerCells.length, bodyCells.length);

      // Save scroll positions before measurement (clearing min-width can shrink
      // the table and cause the browser to clamp scrollLeft to 0).
      const headerScrollContainer = el.querySelector('.table-responsive') as HTMLElement;
      const viewport = el.querySelector('cdk-virtual-scroll-viewport') as HTMLElement;
      const savedHeaderScroll = headerScrollContainer?.scrollLeft ?? 0;
      const savedViewportScroll = viewport?.scrollLeft ?? 0;

      // Clear inline min-widths on ALL body rows. CDK virtual scroll recycles
      // <tr> DOM elements, so rows that were previously the "first row" retain
      // stale min-width styles. With table-layout: auto the column width is
      // determined by the widest cell across all visible rows, so stale
      // min-widths on any row prevent columns from ever shrinking.
      for (const row of allBodyRows) {
        const tds = row.cells;
        for (let i = 0; i < Math.min(tds.length, columnCount); i++) {
          tds[i].style.minWidth = '';
        }
      }
      for (let i = 0; i < columnCount; i++) {
        headerCells[i].style.minWidth = '';
      }

      // Temporarily force both tables to size to content only, overriding
      // Bootstrap's width:100% which causes table-layout:auto to redistribute
      // extra space across columns. Without this, measured widths include
      // redistributed space that varies with each data slice.
      const headerTable = el.querySelector<HTMLElement>('bs-table table');
      const bodyTable = el.querySelector<HTMLElement>('cdk-virtual-scroll-viewport table');
      headerTable?.style.setProperty('width', 'max-content', 'important');
      bodyTable?.style.setProperty('width', 'max-content', 'important');

      // Measure natural content widths across all visible rows
      for (let i = 0; i < columnCount; i++) {
        let colWidth = headerCells[i].offsetWidth;
        for (const row of allBodyRows) {
          const tds = row.cells;
          if (i < tds.length) {
            const w = tds[i].offsetWidth;
            if (w > colWidth) colWidth = w;
          }
        }
        // Update tracked maximum so columns only grow, never shrink
        if (!maxWidths[i] || colWidth > maxWidths[i]) {
          maxWidths[i] = colWidth;
        }
      }

      // Remove temporary width override so tables render normally
      headerTable?.style.removeProperty('width');
      bodyTable?.style.removeProperty('width');

      // Apply max widths to header and ALL body rows to keep them in sync.
      // Setting min-width on every row prevents table-layout:auto from
      // redistributing extra space differently across the two tables when
      // some rows contain placeholder content.
      for (let i = 0; i < columnCount; i++) {
        const w = `${maxWidths[i]}px`;
        headerCells[i].style.minWidth = w;
        for (const row of allBodyRows) {
          const tds = row.cells;
          if (i < tds.length) {
            tds[i].style.minWidth = w;
          }
        }
      }

      // Restore scroll positions after min-widths are re-applied
      if (headerScrollContainer) headerScrollContainer.scrollLeft = savedHeaderScroll;
      if (viewport) viewport.scrollLeft = savedViewportScroll;
    };

    // Sync after first render
    requestAnimationFrame(() => syncWidths());

    // Re-sync when body rows change (virtual scroll swaps rows)
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => syncWidths());
    });

    observer.observe(bodyTableBody, { childList: true, subtree: true });

    this.cleanup.push(() => observer.disconnect());
  }
}
