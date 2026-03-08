import { ChangeDetectionStrategy, Component, computed, contentChildren, input, model, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { PaginationResponse } from '@mintplayer/pagination';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { DatatableSettings } from '../datatable-settings';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { BsRowTemplateContext } from '../row-template/row-template.directive';


@Component({
  selector: 'bs-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  imports: [NgTemplateOutlet, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTableComponent, BsPaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDatatableComponent<TData> {

  readonly columns = contentChildren(BsDatatableColumnDirective);
  numberOfColumns = computed(() => this.columns().length);

  get columnsArray() {
    return this.columns();
  }

  settings = model<DatatableSettings>(new DatatableSettings());
  data = model<PaginationResponse<TData> | undefined>(undefined);

  rowTemplate?: TemplateRef<BsRowTemplateContext<TData>>;

  getSortIndex(columnName: string): number {
    return this.settings().sortColumns.findIndex(c => c.property === columnName);
  }

  getSortDirection(columnName: string): 'ascending' | 'descending' | null {
    const col = this.settings().sortColumns.find(c => c.property === columnName);
    return col?.direction ?? null;
  }

  onHeaderMouseDown(event: MouseEvent) {
    if (event.shiftKey) {
      event.preventDefault();
    }
  }

  columnHeaderClicked(column: BsDatatableColumnDirective, event: MouseEvent) {
    if (!column.sortable) return;

    const currentSettings = this.settings();

    if (event.shiftKey) {
      // Multi-column: add/toggle/remove
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
      // Single-column: replace all
      const existingSingle = currentSettings.sortColumns.length === 1 && currentSettings.sortColumns[0].property === column.name;
      currentSettings.sortColumns = [{
        property: column.name,
        direction: existingSingle && currentSettings.sortColumns[0].direction === 'ascending' ? 'descending' : 'ascending'
      }];
    }

    this.settings.set(new DatatableSettings(currentSettings));
  }

  onPerPageChange(perPage: number) {
    const currentSettings = this.settings();
    currentSettings.perPage.selected = perPage;
    currentSettings.page.selected = 1;
    this.settings.set(new DatatableSettings(currentSettings));
  }

  onPageChange(page: number) {
    const currentSettings = this.settings();
    currentSettings.page.selected = page;
    this.settings.set(new DatatableSettings(currentSettings));
  }

}
