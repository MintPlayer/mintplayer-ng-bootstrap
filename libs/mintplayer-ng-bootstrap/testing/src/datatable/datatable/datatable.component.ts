import { Component, Input, Output, EventEmitter, ContentChildren } from '@angular/core';
import { BsDatatableComponent } from '@mintplayer/ng-bootstrap/datatable';
import { PaginationResponse } from '@mintplayer/pagination';
import { BsDatatableColumnMockDirective } from '../datatable-column/datatable-column.directive';
import { DatatableSettingsMock } from '../datatable-settings';

@Component({
  selector: 'bs-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  providers: [
    { provide: BsDatatableComponent, useExisting: BsDatatableMockComponent }
  ]
})
export class BsDatatableMockComponent {
  
  constructor() {
    this.settings = new DatatableSettingsMock();
  }

  @Input() settings: DatatableSettingsMock;
  @Input() data?: PaginationResponse<any>;
  @Output() reloadData: EventEmitter<any> = new EventEmitter();
  @ContentChildren(BsDatatableColumnMockDirective) columns!: BsDatatableColumnMockDirective[];
}
