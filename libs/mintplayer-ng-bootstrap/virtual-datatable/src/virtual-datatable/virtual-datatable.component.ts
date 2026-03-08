import { ChangeDetectionStrategy, Component, contentChildren, input, model, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { DatatableSettings } from '@mintplayer/ng-bootstrap/datatable';
import { BsDatatableColumnDirective } from '@mintplayer/ng-bootstrap/datatable';
import { VirtualDatatableDataSource } from '../virtual-datatable-data-source';
import { BsVirtualRowTemplateContext } from '../virtual-row-template/virtual-row-template.directive';

@Component({
  selector: 'bs-virtual-datatable',
  templateUrl: './virtual-datatable.component.html',
  styleUrls: ['./virtual-datatable.component.scss'],
  imports: [NgTemplateOutlet, ScrollingModule, BsTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsVirtualDatatableComponent<TData> {

  readonly columns = contentChildren(BsDatatableColumnDirective);

  get columnsArray() {
    return this.columns();
  }

  settings = model<DatatableSettings>(new DatatableSettings());
  dataSource = input.required<VirtualDatatableDataSource<TData>>();
  itemSize = input(48);

  rowTemplate?: TemplateRef<BsVirtualRowTemplateContext<TData>>;

  getSortIndex(columnName: string): number {
    return this.settings().sortColumns.findIndex(c => c.property === columnName);
  }

  getSortDirection(columnName: string): 'ascending' | 'descending' | null {
    const col = this.settings().sortColumns.find(c => c.property === columnName);
    return col?.direction ?? null;
  }

  columnHeaderClicked(column: BsDatatableColumnDirective, event: MouseEvent) {
    if (!column.sortable) return;

    const currentSettings = this.settings();

    if (event.shiftKey) {
      const existingIndex = currentSettings.sortColumns.findIndex(c => c.property === column.name);
      if (existingIndex === -1) {
        currentSettings.sortColumns = [...currentSettings.sortColumns, { property: column.name, direction: 'ascending' }];
      } else if (currentSettings.sortColumns[existingIndex].direction === 'ascending') {
        currentSettings.sortColumns = currentSettings.sortColumns.map((c, i) =>
          i === existingIndex ? { ...c, direction: 'descending' as const } : c
        );
      } else {
        currentSettings.sortColumns = currentSettings.sortColumns.filter((_, i) => i !== existingIndex);
      }
    } else {
      const existingSingle = currentSettings.sortColumns.length === 1 && currentSettings.sortColumns[0].property === column.name;
      currentSettings.sortColumns = [{
        property: column.name,
        direction: existingSingle && currentSettings.sortColumns[0].direction === 'ascending' ? 'descending' : 'ascending'
      }];
    }

    this.settings.set(new DatatableSettings(currentSettings));
  }
}
