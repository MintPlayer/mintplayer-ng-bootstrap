import { ChangeDetectionStrategy, Component, input, TemplateRef } from '@angular/core';
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
export class BsVirtualDatatableComponent<TData> extends DatatableSortBase {

  dataSource = input.required<VirtualDatatableDataSource<TData>>();
  itemSize = input(48);

  rowTemplate?: TemplateRef<BsVirtualRowTemplateContext<TData>>;
}
