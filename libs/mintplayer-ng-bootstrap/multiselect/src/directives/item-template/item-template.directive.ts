import { Directive, effect, inject, input, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsItemTemplate]',
})
export class BsItemTemplateDirective<T> {
  private multiselect = inject<BsMultiselectComponent<T>>(BsMultiselectComponent);

  constructor() {
    const template = inject(TemplateRef);
    this.multiselect.itemTemplate = template;

    effect(() => {
      const value = this.bsItemTemplateOf();
      if (value) {
        this.multiselect.items.set(value);
      }
    });
  }

  public static ngTemplateContextGuard<TData>(
    dir: BsItemTemplateDirective<TData>,
    ctx: any
  ): ctx is BsItemTemplateContext<Exclude<TData, false | 0 | '' | null | undefined>> {
    return true;
  }

  /** Pass the items array — forwards to BsMultiselectComponent.items */
  readonly bsItemTemplateOf = input<T[] | undefined>(undefined);
}

export class BsItemTemplateContext<T> {
  public $implicit: T = null!;
}
