import { Component, Input, ContentChildren, TemplateRef, EventEmitter, Output } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { PaginationResponse } from '@mintplayer/pagination';
import { DatatableSettings } from '../datatable-settings';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { BsRowTemplateContext } from '../row-template/row-template.directive';


@Component({
  selector: 'bs-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  standalone: false,
})
export class BsDatatableComponent<TData> {

  constructor() {
    this.settings = new DatatableSettings();
    this.settings.sortProperty = '';
    this.settings.sortDirection = 'ascending';
    this.settings.perPage = { values: [10, 20, 50], selected: 20 };
    this.settings.page = { values: [1], selected: 1 };

    this.numberOfColumns$ = this.columns$.pipe(map(columns => columns.length));
  }
  
  //#region Columns
  columns$ = new BehaviorSubject<BsDatatableColumnDirective[]>([]);
  numberOfColumns$: Observable<number>;
  @ContentChildren(BsDatatableColumnDirective) set columns(value: BsDatatableColumnDirective[]) {
    this.columns$.next(value);
  }
  //#endregion

  @Input() settings: DatatableSettings;
  @Input() data?: PaginationResponse<TData>;
  rowTemplate?: TemplateRef<BsRowTemplateContext<TData>>;
  @Output() settingsChange = new EventEmitter<DatatableSettings>();

  columnHeaderClicked(column: BsDatatableColumnDirective) {
    if (column.sortable()) {
      if (this.settings.sortProperty !== column.name()) {
        this.settings.sortProperty = column.name();
        this.settings.sortDirection = 'ascending';
      } else if (this.settings.sortDirection === 'descending') {
        this.settings.sortDirection = 'ascending';
      } else {
        this.settings.sortDirection = 'descending';
      }
      this.settingsChange.emit(this.settings);
    }
  }

}
