import { Directive, inject, input, TemplateRef } from '@angular/core';

/** The context of a `*bsTypeaheadItem` template: the item and the current term (for highlighting). */
export interface BsTypeaheadItemContext<T = unknown> {
  $implicit: T;
  term: string;
}

/**
 * Renders one suggestion row. Declared inside `<bs-typeahead>`; absent, the
 * row shows the item's text (`itemText`).
 *
 * ```html
 * <bs-typeahead [provider]="streets">
 *   <ng-container *bsTypeaheadItem="let street; let term = term; of: streetList">
 *     {{ street.name }} <small>{{ street.municipality }}</small>
 *   </ng-container>
 * </bs-typeahead>
 * ```
 *
 * `of:` is optional and only carries the item type into the template (like
 * `ngFor`'s `of`); pass any value of the item type or an array of it.
 */
@Directive({ selector: '[bsTypeaheadItem]' })
export class BsTypeaheadItemDirective<T = unknown> {
  readonly templateRef = inject<TemplateRef<BsTypeaheadItemContext<T>>>(TemplateRef);
  /** Type carrier only; never read at runtime. */
  readonly bsTypeaheadItemOf = input<readonly T[] | T | null | undefined>(undefined);

  static ngTemplateContextGuard<T>(_dir: BsTypeaheadItemDirective<T>, ctx: unknown): ctx is BsTypeaheadItemContext<T> {
    return true;
  }
}
