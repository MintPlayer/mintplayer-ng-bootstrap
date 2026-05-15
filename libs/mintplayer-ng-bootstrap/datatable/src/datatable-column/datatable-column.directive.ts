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
  /**
   * Header template (what renders in the `<th>`). Read as
   * `column.templateRef` from the host component's template; we keep the
   * generic `templateRef` name so existing `*ngTemplateOutlet` bindings
   * stay valid. Conceptually this is the "column header template" —
   * see the JSDoc on the directive above.
   */
  readonly templateRef = inject(TemplateRef);

  /** Data property name on each row; used as `SortColumn.property` on sort. */
  readonly name = input('', { alias: 'bsDatatableColumn' });

  readonly sortable = input(true, { alias: 'bsDatatableColumnSortable' });

  /**
   * Plain-text fallback header. Always `null` for directive-defined columns —
   * their `templateRef` is the source of truth. Exists so this type satisfies
   * the shared `DatatableColumnRef` interface (used by programmatic columns
   * via `<bs-datatable [columns]="...">`).
   */
  readonly label: string | null = null;
}
