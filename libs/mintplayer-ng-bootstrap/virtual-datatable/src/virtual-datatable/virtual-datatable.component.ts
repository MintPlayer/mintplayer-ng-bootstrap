import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, input, NgZone, OnDestroy, TemplateRef } from '@angular/core';
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
  private readonly ngZone = inject(NgZone);
  private cleanup: (() => void)[] = [];

  dataSource = input.required<VirtualDatatableDataSource<TData>>();
  isResponsive = input(false);
  itemSize = input(48);

  rowTemplate?: TemplateRef<BsVirtualRowTemplateContext<TData>>;

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

    this.ngZone.runOutsideAngular(() => {
      headerScrollContainer.addEventListener('scroll', onHeaderScroll, { passive: true });
      viewport.addEventListener('scroll', onViewportScroll, { passive: true });
    });

    this.cleanup.push(() => {
      headerScrollContainer.removeEventListener('scroll', onHeaderScroll);
      viewport.removeEventListener('scroll', onViewportScroll);
    });
  }

  private setupColumnWidthSync() {
    const el = this.elementRef.nativeElement as HTMLElement;
    const bodyTableBody = el.querySelector('cdk-virtual-scroll-viewport tbody') as HTMLElement;

    if (!bodyTableBody) return;

    // Track the max width seen for each column so we only grow, never shrink
    // (prevents layout jumps as rows scroll in/out of view).
    const maxWidths: number[] = [];

    const syncWidths = () => {
      const headerCells = el.querySelectorAll<HTMLElement>('bs-table thead th');
      const firstBodyRow = el.querySelector<HTMLElement>('cdk-virtual-scroll-viewport tbody tr');
      const bodyCells = firstBodyRow?.querySelectorAll<HTMLElement>('td');

      if (!headerCells.length || !bodyCells?.length) return;

      const columnCount = Math.min(headerCells.length, bodyCells.length);

      // Save scroll positions before measurement (clearing min-width can shrink
      // the table and cause the browser to clamp scrollLeft to 0).
      const headerScrollContainer = el.querySelector('.table-responsive') as HTMLElement;
      const viewport = el.querySelector('cdk-virtual-scroll-viewport') as HTMLElement;
      const savedHeaderScroll = headerScrollContainer?.scrollLeft ?? 0;
      const savedViewportScroll = viewport?.scrollLeft ?? 0;

      // Clear inline widths so we can measure natural sizes
      for (let i = 0; i < columnCount; i++) {
        headerCells[i].style.minWidth = '';
        bodyCells[i].style.minWidth = '';
      }

      // Measure natural widths and update tracked maximums
      for (let i = 0; i < columnCount; i++) {
        const headerW = headerCells[i].offsetWidth;
        const bodyW = bodyCells[i].offsetWidth;
        const natural = Math.max(headerW, bodyW);
        if (!maxWidths[i] || natural > maxWidths[i]) {
          maxWidths[i] = natural;
        }
      }

      // Always re-apply max widths (cells were cleared above for measurement)
      for (let i = 0; i < columnCount; i++) {
        const w = `${maxWidths[i]}px`;
        headerCells[i].style.minWidth = w;
        bodyCells[i].style.minWidth = w;
      }

      // Restore scroll positions after min-widths are re-applied
      if (headerScrollContainer) headerScrollContainer.scrollLeft = savedHeaderScroll;
      if (viewport) viewport.scrollLeft = savedViewportScroll;
    };

    // Sync after first render
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => syncWidths());
    });

    // Re-sync when body rows change (virtual scroll swaps rows)
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => syncWidths());
    });

    this.ngZone.runOutsideAngular(() => {
      observer.observe(bodyTableBody, { childList: true, subtree: true });
    });

    this.cleanup.push(() => observer.disconnect());
  }
}
