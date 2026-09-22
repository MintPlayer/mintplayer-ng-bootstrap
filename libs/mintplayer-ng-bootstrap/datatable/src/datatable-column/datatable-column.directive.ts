import { Directive, inject, input, TemplateRef, type Signal } from '@angular/core';
import type { FilterContext, FilterSelection, DistinctValues } from '@mintplayer/web-components/datatable';

/**
 * Context of a `*bsDatatableFilterPanel` template.
 *
 * `$implicit` is a **Signal**, not a plain object. The demos and the specs run
 * zoneless, where mutating a context object notifies nothing and the panel never
 * repaints; a signal the wrapper writes to is what makes the override update as
 * values load.
 */
export interface BsDatatableFilterPanelContext {
  $implicit: Signal<DistinctValues | null>;
  ctx: FilterContext;
}

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

  /** Opt this column into the filter row. Default `false`, unlike `sortable`. */
  readonly filterable = input(false, { alias: 'bsDatatableColumnFilterable' });

  /**
   * Purely visual: marks this column's trigger as "filtered". The component
   * attaches no meaning to it — the consumer decides when it is true, because
   * the component never filters the data itself.
   */
  readonly filterActive = input(false, { alias: 'bsDatatableColumnFilterActive' });

  /** Short description of the active filter, shown on the trigger and in its name. */
  readonly filterSummary = input<string | undefined>(undefined, {
    alias: 'bsDatatableColumnFilterSummary',
  });

  /** Initial or externally restored selection for this column's panel. */
  readonly filterSelection = input<FilterSelection | undefined>(undefined, {
    alias: 'bsDatatableColumnFilterSelection',
  });

  /**
   * Set by a nested `*bsDatatableFilterPanel`, and a **plain field** rather than
   * a signal on purpose.
   *
   * The nested directive assigns this from its constructor, which runs while
   * the column's own header view is being created — i.e. inside a reactive
   * read. Writing a signal there is NG0600. Nothing reads this reactively: the
   * wrapper resolves it when the web component asks for the panel's contents,
   * which is at panel open, long after any computed has settled.
   */
  filterPanelTemplate?: TemplateRef<BsDatatableFilterPanelContext>;
}
