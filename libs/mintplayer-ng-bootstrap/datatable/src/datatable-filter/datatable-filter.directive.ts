import { Directive, inject, input, TemplateRef } from '@angular/core';

/**
 * Declares the filter panel for a column in `<bs-datatable>`.
 *
 *  - `bsDatatableFilter` (the directive value) is the **column name** — it must
 *    match the `bsDatatableColumn` value of the column this filter belongs to.
 *  - The directive's **template content** is the panel body: whatever the
 *    consumer wants inside the dropdown.
 *
 * Example:
 * ```html
 * <div *bsDatatableColumn="'country'">Country</div>
 * <div *bsDatatableFilter="'country'">
 *   <input [(ngModel)]="countryFilter" placeholder="Contains…" />
 * </div>
 * ```
 *
 * This is a sibling of `BsDatatableColumnDirective` rather than an option on
 * it, because a structural directive has exactly one `TemplateRef` and that one
 * is already the header template.
 *
 * The component owns the trigger button, its accessible name, `aria-expanded`
 * and the open/close keyboard contract; this template supplies only the panel's
 * contents. It attaches no filter semantics — what the filter *means*, and what
 * to do when it changes, is entirely the consumer's.
 */
@Directive({ selector: '[bsDatatableFilter]' })
export class BsDatatableFilterDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

  /** Column name this filter belongs to; matches `bsDatatableColumn`. */
  readonly name = input('', { alias: 'bsDatatableFilter' });

  /**
   * Purely visual: marks the column's trigger as "filtered". The component
   * attaches no meaning to it — the consumer decides when it is true.
   */
  readonly active = input(false, { alias: 'bsDatatableFilterActive' });
}
