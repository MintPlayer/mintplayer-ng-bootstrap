import { Directive, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsButtonTemplate]',
  standalone: false,
})
export class BsButtonTemplateDirective<T> {

  constructor(template: TemplateRef<any>, multiselect: BsMultiselectComponent<T>) {
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
