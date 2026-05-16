import { Directive, inject, input, TemplateRef } from '@angular/core';

/**
 * Declares a column in `<bs-datatable>`.
 *
 *  - `bsDatatableColumn` (the directive value) is the **data property name** —
 *    it must match the field key on each row in the fetched data and is what
 *    `SortColumn.property` references when the column is clicked.
 *  - The directive's **template content** is the header template — what gets
 *    rendered inside the `<th>`.
 *
 * Example:
 * ```html
 * <div *bsDatatableColumn="'YearStarted'; sortable: true">Year started</div>
 * ```
 *
 * Optional `bsDatatableColumnSortable` controls whether the header acts as a
 * sort toggle (default `true`).
 */
@Directive({ selector: '[bsDatatableColumn]' })
export class BsDatatableColumnDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

  /** Data property name on each row; used as `SortColumn.property` on sort. */
  readonly name = input('', { alias: 'bsDatatableColumn' });

  readonly sortable = input(true, { alias: 'bsDatatableColumnSortable' });
}
