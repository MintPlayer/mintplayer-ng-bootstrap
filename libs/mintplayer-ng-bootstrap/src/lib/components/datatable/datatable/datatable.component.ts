import { Component, ContentChildren, EventEmitter, Input, OnInit, Output, TemplateRef } from '@angular/core';
import { BsDatatableColumnComponent } from '@mintplayer/ng-bootstrap';
import { PaginationResponse } from '@mintplayer/ng-pagination';
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

  @ContentChildren(BsDatatableColumnComponent) columns: BsDatatableColumnComponent[] = [];
  @Input() settings: DatatableSettings;
  @Input() data?: PaginationResponse<any>;
  rowTemplate?: TemplateRef<any>;
  @Output() onReloadData: EventEmitter<any> = new EventEmitter();

  columnHeaderClicked(column: BsDatatableColumnComponent) {
    if (column.sortable) {
      if (this.settings.sortProperty !== column.name) {
        this.settings.sortProperty = column.name;
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
