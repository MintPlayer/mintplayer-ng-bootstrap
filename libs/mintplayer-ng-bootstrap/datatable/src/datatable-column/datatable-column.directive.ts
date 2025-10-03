import { Directive, inject, input, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsDatatableColumn]',
  standalone: false,
})
export class BsDatatableColumnDirective {

  templateRef = inject(TemplateRef<any>);
  public name = input<string>('', { alias: 'bsDatatableColumn' });
  public sortable = input<boolean>(true, { alias: 'bsDatatableColumnSortable' });

}