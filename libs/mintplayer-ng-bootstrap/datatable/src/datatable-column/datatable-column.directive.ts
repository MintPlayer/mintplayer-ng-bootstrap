import { Directive, inject, input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsDatatableColumn]',
})
export class BsDatatableColumnDirective {
  templateRef = inject(TemplateRef);
  readonly name = input('', { alias: 'bsDatatableColumn' });
  readonly sortable = input(true, { alias: 'bsDatatableColumnSortable' });

}