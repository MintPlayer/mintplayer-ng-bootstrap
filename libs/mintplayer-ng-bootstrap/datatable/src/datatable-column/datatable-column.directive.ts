import { Directive, Input, TemplateRef } from '@angular/core';
import { DatatableColumnMetadata } from './datatable-column-metadata';

@Directive({
  selector: '[bsDatatableColumn]'
})
export class BsDatatableColumnDirective {

  constructor(templateRef: TemplateRef<any>) {
    this.templateRef = templateRef;
  }

  templateRef: TemplateRef<any>;
  @Input() public bsDatatableColumn: DatatableColumnMetadata = { name: '', sortable: true };

}
