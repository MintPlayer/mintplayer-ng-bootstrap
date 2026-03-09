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
  private scrollCleanup?: () => void;

  dataSource = input.required<VirtualDatatableDataSource<TData>>();
  itemSize = input(48);

  rowTemplate?: TemplateRef<BsVirtualRowTemplateContext<TData>>;

  ngAfterViewInit() {
    this.setupScrollSync();
  }

  ngOnDestroy() {
    this.scrollCleanup?.();
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

    this.scrollCleanup = () => {
      headerScrollContainer.removeEventListener('scroll', onHeaderScroll);
      viewport.removeEventListener('scroll', onViewportScroll);
    };
  }
}
