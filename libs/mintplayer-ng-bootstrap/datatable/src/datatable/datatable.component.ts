import { ChangeDetectionStrategy, Component, computed, ContentChildren, Input, input, model, output, signal, TemplateRef } from '@angular/core';
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

  constructor() {
    const defaultSettings = new DatatableSettings();
    defaultSettings.sortProperty = '';
    defaultSettings.sortDirection = 'ascending';
    defaultSettings.perPage = { values: [10, 20, 50], selected: 20 };
    defaultSettings.page = { values: [1], selected: 1 };
    this.settings.set(defaultSettings);
  }

  private _columns = signal<BsDatatableColumnDirective[]>([]);
  numberOfColumns = computed(() => this._columns().length);

  @ContentChildren(BsDatatableColumnDirective) set columns(value: BsDatatableColumnDirective[]) {
    this._columns.set([...value]);
  }
  get columnsArray() {
    return this._columns();
  }

  settings = model<DatatableSettings>(new DatatableSettings());

  // Use a writable signal so the directive can set it programmatically
  private _data = signal<PaginationResponse<TData> | undefined>(undefined);
  get data(): PaginationResponse<TData> | undefined {
    return this._data();
  }
  @Input() set data(value: PaginationResponse<TData> | undefined) {
    this._data.set(value);
  }

  rowTemplate?: TemplateRef<BsRowTemplateContext<TData>>;
  settingsChange = output<DatatableSettings>();

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
      const newSettings = new DatatableSettings(currentSettings);
      this.settings.set(newSettings);
      this.settingsChange.emit(newSettings);
    }
  }

}
