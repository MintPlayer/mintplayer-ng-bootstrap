import { Directive, Input, TemplateRef } from '@angular/core';
import { BsDatatableColumnDirective } from '@mintplayer/ng-bootstrap/datatable';

@Directive({
  selector: '[bsDatatableColumn]',
  providers: [
    { provide: BsDatatableColumnDirective, useExisting: BsDatatableColumnMockDirective },
  ]
})
export class BsDatatableColumnMockDirective {
  @Input() public bsDatatableColumn: DatatableColumnMetadataMock = { name: '', sortable: true };
  templateRef: TemplateRef<any> | null = null;
}

export interface DatatableColumnMetadataMock {
  name: string;
  sortable: boolean;
}