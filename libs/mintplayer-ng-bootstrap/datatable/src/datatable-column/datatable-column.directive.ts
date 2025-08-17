import { Directive, inject, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsDatatableColumn]',
  standalone: false,
})
export class BsDatatableColumnDirective {
  templateRef = inject(TemplateRef<any>);
  @Input('bsDatatableColumn') public name = '';
  @Input('bsDatatableColumnSortable') public sortable = true;
}