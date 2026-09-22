import { DestroyRef, Directive, inject, TemplateRef } from '@angular/core';
import {
  BsDatatableColumnDirective,
  type BsDatatableFilterPanelContext,
} from '../datatable-column/datatable-column.directive';

/**
 * Overrides the filter panel of the column it is nested in.
 *
 * ```html
 * <div *bsDatatableColumn="'country'; filterable: true">
 *   Country
 *   <ng-container *bsDatatableFilterPanel="let values">
 *     <my-panel [values]="values()"></my-panel>
 *   </ng-container>
 * </div>
 * ```
 *
 * Nested inside the column rather than a sibling keyed by name: the column is
 * the thing being configured, and a name-keyed sibling has no way to fail loudly
 * when the two names drift apart. It is also the pattern every other per-item
 * override in this workspace uses.
 *
 * Omitting it is not a lesser option — the web component renders a built-in
 * panel (search, include/exclude, checkbox list, clear) which React and Vue get
 * for free. This directive is for the cases that need something else.
 *
 * ### Inputs on the column, not here
 *
 * `filterable`, `filterActive`, `filterSummary` and `filterSelection` are inputs
 * on `*bsDatatableColumn`. They cannot live here: this directive's own inputs
 * are not yet set when its constructor runs, and the constructor is the only
 * point at which it can register itself with the column early enough.
 */
@Directive({ selector: '[bsDatatableFilterPanel]' })
export class BsDatatableFilterPanelDirective {
  private readonly column = inject(BsDatatableColumnDirective);
  private readonly templateRef =
    inject<TemplateRef<BsDatatableFilterPanelContext>>(TemplateRef);

  constructor() {
    // A plain field assignment, deliberately. See the field's own comment on
    // `BsDatatableColumnDirective`: a signal write here is NG0600.
    this.column.filterPanelTemplate = this.templateRef;

    inject(DestroyRef).onDestroy(() => {
      // Guarded: under `@if`, the incoming directive's constructor can run
      // before the outgoing one's destroy hook, and an unguarded clear would
      // erase the template that just replaced this one.
      if (this.column.filterPanelTemplate === this.templateRef) {
        this.column.filterPanelTemplate = undefined;
      }
    });
  }

  /**
   * Lets `let values = $implicit` and `let ctx = ctx` type-check against the
   * real context. Without it both are `any`, so `values().anything.deeper`
   * compiles and fails at runtime.
   */
  static ngTemplateContextGuard(
    _dir: BsDatatableFilterPanelDirective,
    _ctx: unknown,
  ): _ctx is BsDatatableFilterPanelContext {
    return true;
  }
}
