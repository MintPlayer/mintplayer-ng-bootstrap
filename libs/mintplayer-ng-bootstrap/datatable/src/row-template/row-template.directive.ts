import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks an `<ng-template>` as the per-row body for `<bs-datatable>`. The
 * template's `$implicit` is the row object. The template should render one
 * `<td>` per data column (in column order).
 *
 * Example:
 * ```html
 * <ng-container *bsRowTemplate="let artist">
 *   <td class="text-nowrap">{{ artist?.name }}</td>
 *   <td class="text-nowrap">{{ artist?.yearStarted }}</td>
 * </ng-container>
 * ```
 */
@Directive({ selector: '[bsRowTemplate]' })
export class BsRowTemplateDirective<TData = unknown> {
  readonly templateRef = inject<TemplateRef<BsRowTemplateContext<TData>>>(TemplateRef);

  static ngTemplateContextGuard<TData>(
    _dir: BsRowTemplateDirective<TData>,
    ctx: unknown,
  ): ctx is BsRowTemplateContext<Exclude<TData, false | 0 | '' | null | undefined>> {
    return true;
  }
}

export class BsRowTemplateContext<TData = unknown> {
  $implicit: TData | undefined = undefined;
  index?: number;
}
