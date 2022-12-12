import { Directive, Input } from '@angular/core';

@Directive({
  selector: '[bsDatatableColumn]'
})
export class BsDatatableColumnMockDirective {
  @Input() public bsDatatableColumn: DatatableColumnMetadata = { name: '', sortable: true };
}

export interface DatatableColumnMetadata {
  name: string;
  sortable: boolean;
}