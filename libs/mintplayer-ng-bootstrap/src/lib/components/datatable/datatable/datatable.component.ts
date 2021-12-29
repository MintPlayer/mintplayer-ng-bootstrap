import { Component, ContentChildren, EventEmitter, Input, OnInit, Output, TemplateRef } from '@angular/core';
import { PaginationResponse } from '@mintplayer/ng-pagination';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { DatatableSettings } from '../datatable-settings';

@Component({
  selector: 'bs-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss']
})
export class BsDatatableComponent implements OnInit {

  constructor() {
    this.settings = new DatatableSettings();
    this.settings.sortProperty = '';
    this.settings.sortDirection = 'ascending';
    this.settings.perPage = { values: [10, 20, 50], selected: 20 };
    this.settings.page = { values: [1], selected: 1 };
  }

  @ContentChildren(BsDatatableColumnDirective) columns: BsDatatableColumnDirective[] = [];
  @Input() settings: DatatableSettings;
  @Input() data?: PaginationResponse<any>;
  rowTemplate?: TemplateRef<any>;
  @Output() onReloadData: EventEmitter<any> = new EventEmitter();

  columnHeaderClicked(column: BsDatatableColumnDirective) {
    if (column.bsDatatableColumn.sortable) {
      if (this.settings.sortProperty !== column.bsDatatableColumn.name) {
        this.settings.sortProperty = column.bsDatatableColumn.name;
        this.settings.sortDirection = 'ascending';
      } else if (this.settings.sortDirection === 'descending') {
        this.settings.sortDirection = 'ascending';
      } else {
        this.settings.sortDirection = 'descending';
      }
      this.onReloadData.emit();
    }
  }

  ngOnInit() {
  }
  
}
