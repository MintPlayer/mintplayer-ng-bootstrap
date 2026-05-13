import { Directive, inject, input, TemplateRef } from '@angular/core';

/**
 * Declares a column in `<bs-datatable>`.
 *
 *  - `bsDatatableColumn` (the directive value) is the **data property name** —
 *    it must match the field key on each row in the fetched data and is what
 *    `SortColumn.property` references when the column is clicked.
 *  - The directive's **template content** is the header template — what gets
 *    rendered inside the `<th>`. It's exposed as `headerTemplateRef` and
 *    outlet'd by the host component.
 *
 * Example:
 * ```html
 * <ng-template bsDatatableColumn="YearStarted">Year started</ng-template>
 * <!--                          ^^^^^^^^^^^      ^^^^^^^^^^^^                -->
 * <!--                          data field       header label                -->
 * ```
 */
@Directive({
  selector: '[bsDatatableColumn]',
})
export class BsDatatableColumnDirective {
  /** Header template (what renders in the `<th>`). */
  readonly headerTemplateRef = inject(TemplateRef);

  /** Data property name on each row; used as `SortColumn.property` on sort. */
  readonly name = input('', { alias: 'bsDatatableColumn' });

  readonly sortable = input(true, { alias: 'bsDatatableColumnSortable' });
}
