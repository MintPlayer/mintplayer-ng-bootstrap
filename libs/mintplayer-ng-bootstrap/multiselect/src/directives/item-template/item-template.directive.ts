import { Directive, inject, input, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsItemTemplate]',
})
export class BsItemTemplateDirective<T> {

  constructor() {
    const template = inject(TemplateRef);
    const multiselect = inject<BsMultiselectComponent<T>>(BsMultiselectComponent);
    multiselect.itemTemplate = template;
  }

  public static ngTemplateContextGuard<TData>(
    dir: BsItemTemplateDirective<TData>,
    ctx: any
  ): ctx is BsItemTemplateContext<Exclude<TData, false | 0 | '' | null | undefined>> {
    return true;
  }

  /** Used for type inference — pass the same array as [items] on bs-multiselect */
  readonly bsItemTemplateOf = input<T[] | undefined>(undefined);
}

export class BsItemTemplateContext<T> {
  public $implicit: T = null!;
}
