import { Component, ContentChildren, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { PaginationResponse } from '@mintplayer/pagination';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { DatatableSettings } from '../datatable-settings';

@Component({
  selector: 'bs-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss']
})
export class BsDatatableComponent {

  constructor() {
    this.settings = new DatatableSettings();
    this.settings.sortProperty = '';
    this.settings.sortDirection = 'ascending';
    this.settings.perPage = { values: [10, 20, 50], selected: 20 };
    this.settings.page = { values: [1], selected: 1 };

  }

  @Input() settings: DatatableSettings;
  @Input() data?: PaginationResponse<any>;
  rowTemplate?: TemplateRef<any>;
  @Output() reloadData = new EventEmitter<DatatableSettings>();

  columnHeaderClicked(column: any) {
    if (column.bsDatatableColumn.sortable) {
      if (this.settings.sortProperty !== column.bsDatatableColumn.name) {
        this.settings.sortProperty = column.bsDatatableColumn.name;
        this.settings.sortDirection = 'ascending';
      } else if (this.settings.sortDirection === 'descending') {
        this.settings.sortDirection = 'ascending';
      } else {
        this.settings.sortDirection = 'descending';
      }
      this.reloadData.emit(this.settings);
    }
  }

}
