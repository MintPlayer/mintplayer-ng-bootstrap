import { ChangeDetectionStrategy, Component, computed, ContentChildren, input, model, signal, TemplateRef } from '@angular/core';
import { PaginationResponse } from '@mintplayer/pagination';
import { DatatableSettings } from '../datatable-settings';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { BsRowTemplateContext } from '../row-template/row-template.directive';


@Component({
  selector: 'bs-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDatatableComponent<TData> {

  private _columns = signal<BsDatatableColumnDirective[]>([]);
  numberOfColumns = computed(() => this._columns().length);

  @ContentChildren(BsDatatableColumnDirective) set columns(value: BsDatatableColumnDirective[]) {
    this._columns.set([...value]);
  }
  get columnsArray() {
    return this._columns();
  }

  settings = model<DatatableSettings>(new DatatableSettings());
  data = model<PaginationResponse<TData> | undefined>(undefined);

  rowTemplate?: TemplateRef<BsRowTemplateContext<TData>>;

  columnHeaderClicked(column: BsDatatableColumnDirective) {
    if (column.sortable) {
      const currentSettings = this.settings();
      if (currentSettings.sortProperty !== column.name) {
        currentSettings.sortProperty = column.name;
        currentSettings.sortDirection = 'ascending';
      } else if (currentSettings.sortDirection === 'descending') {
        currentSettings.sortDirection = 'ascending';
      } else {
        currentSettings.sortDirection = 'descending';
      }
      this.settings.set(new DatatableSettings(currentSettings));
    }
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
