import { Directive, inject, TemplateRef } from '@angular/core';
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
  ): ctx is BsItemTemplateContext<TData> {
    return true;
  }

}

export class BsItemTemplateContext<T> {
  public $implicit: T = null!;
}
