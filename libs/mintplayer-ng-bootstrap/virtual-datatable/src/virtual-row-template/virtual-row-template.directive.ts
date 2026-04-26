import { Directive, inject, TemplateRef } from '@angular/core';
import { BsVirtualDatatableComponent } from '../virtual-datatable/virtual-datatable.component';

@Directive({
  selector: '[bsVirtualRowTemplate]',
})
export class BsVirtualRowTemplateDirective<TData> {

  private datatableComponent = inject<BsVirtualDatatableComponent<TData>>(BsVirtualDatatableComponent);
  private templateRef = inject<TemplateRef<BsVirtualRowTemplateContext<TData>>>(TemplateRef);

  constructor() {
    this.datatableComponent.rowTemplate.set(this.templateRef);
  }

  public static ngTemplateContextGuard<TData>(
    dir: BsVirtualRowTemplateDirective<TData>,
    ctx: any
  ): ctx is BsVirtualRowTemplateContext<Exclude<TData, false | 0 | '' | null | undefined>> {
    return true;
  }
}

export class BsVirtualRowTemplateContext<TData = unknown> {
  public $implicit: TData = null!;
}
