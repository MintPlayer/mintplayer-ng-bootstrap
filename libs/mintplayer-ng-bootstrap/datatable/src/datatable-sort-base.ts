import { contentChildren, Directive, model } from '@angular/core';
import { DatatableSettings } from './datatable-settings';
import { BsDatatableColumnDirective } from './datatable-column/datatable-column.directive';

@Directive()
export abstract class DatatableSortBase {

  readonly columns = contentChildren(BsDatatableColumnDirective);

  get columnsArray() {
    return this.columns();
  }

  settings = model<DatatableSettings>(new DatatableSettings());

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
    if (!column.sortable()) return;

    const columnName = column.name();
    const currentSettings = this.settings();
    let sortColumns = currentSettings.sortColumns;

    if (event.shiftKey) {
      // Multi-column: add/toggle/remove
      const existingIndex = sortColumns.findIndex(c => c.property === columnName);
      if (existingIndex === -1) {
        sortColumns = [...sortColumns, { property: columnName, direction: 'ascending' as const }];
      } else if (sortColumns[existingIndex].direction === 'ascending') {
        sortColumns = sortColumns.map((c, i) =>
          i === existingIndex ? { ...c, direction: 'descending' as const } : c
        );
      } else {
        sortColumns = sortColumns.filter((_, i) => i !== existingIndex);
      }
    } else {
      // Single-column: replace all
      const existingSingle = sortColumns.length === 1 && sortColumns[0].property === columnName;
      sortColumns = [{
        property: columnName,
        direction: existingSingle && sortColumns[0].direction === 'ascending' ? 'descending' as const : 'ascending' as const
      }];
    }

    this.settings.set(new DatatableSettings({ ...currentSettings, sortColumns }));
  }
}
