import { Directive, inject, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsButtonTemplate]',
  standalone: false,
})
export class BsButtonTemplateDirective<T> {

  constructor() {
    const template = inject(TemplateRef);
    const multiselect = inject<BsMultiselectComponent<T>>(BsMultiselectComponent);
    multiselect.buttonTemplate = template;
  }
  
  public static ngTemplateContextGuard<TData>(
    dir: BsButtonTemplateDirective<TData>,
    ctx: any
  ): ctx is BsRButtonTemplateContext {
    return true;
  }

}

export class BsRButtonTemplateContext {
  public $implicit: number = null!;
}
