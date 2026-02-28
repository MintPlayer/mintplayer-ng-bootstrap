import { Directive, inject, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsDatatableColumn]',
})
export class BsDatatableColumnDirective {
  templateRef = inject(TemplateRef);
  @Input('bsDatatableColumn') public name = '';
  @Input('bsDatatableColumnSortable') public sortable = true;

}