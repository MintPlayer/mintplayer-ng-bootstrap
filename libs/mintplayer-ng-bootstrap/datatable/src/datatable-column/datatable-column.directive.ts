import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsDatatableColumn]',
  standalone: false,
})
export class BsDatatableColumnDirective {

  constructor(templateRef: TemplateRef<any>) {
    this.templateRef = templateRef;
  }

  templateRef: TemplateRef<any>;
  @Input('bsDatatableColumn') public name = '';
  @Input('bsDatatableColumnSortable') public sortable = true;

}