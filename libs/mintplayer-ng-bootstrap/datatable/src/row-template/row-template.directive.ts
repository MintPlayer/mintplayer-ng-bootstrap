import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks an `<ng-template>` as the per-row body for `<bs-datatable>`. The
 * template's `$implicit` is the row object. The template should render one
 * `<td>` per data column (in column order).
 *
 * In tree mode (`[tree]="true"`) the context also carries `depth` (0 for
 * roots, +1 per nesting level), `isExpanded`, and `isPlaceholder` (true when
 * the row is a not-yet-loaded child slot — `$implicit` is undefined).
 *
 * Example:
 * ```html
 * <ng-container *bsRowTemplate="let artist">
 *   <td class="text-nowrap">{{ artist?.name }}</td>
 *   <td class="text-nowrap">{{ artist?.yearStarted }}</td>
 * </ng-container>
 *
 * <!-- tree mode: render a spinner for placeholder rows -->
 * <ng-container *bsRowTemplate="let item; let isPlaceholder = isPlaceholder">
 *   @if (isPlaceholder) { <td colspan="3"><i>Loading…</i></td> }
 *   @else { <td>{{ item.name }}</td><td>{{ item.headcount }}</td><td>{{ item.code }}</td> }
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
  /** 0 for roots; +1 per nesting level. Always 0 in flat mode. */
  depth = 0;
  /** True when the row is currently expanded. Always false in flat mode. */
  isExpanded = false;
  /** True when the row is a not-yet-loaded child slot — `$implicit` is undefined. */
  isPlaceholder = false;
}
