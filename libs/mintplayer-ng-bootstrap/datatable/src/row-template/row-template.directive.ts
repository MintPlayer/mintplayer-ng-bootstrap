import { Directive, inject, TemplateRef } from '@angular/core';
import { BsDatatableComponent } from '../datatable/datatable.component';

@Directive({
  selector: '[bsRowTemplate]',
})
export class BsRowTemplateDirective<TData> {

  private datatableComponent = inject<BsDatatableComponent<TData>>(BsDatatableComponent);
  private templateRef = inject<TemplateRef<BsRowTemplateContext<TData>>>(TemplateRef);

  constructor() {
    this.datatableComponent.rowTemplate.set(this.templateRef);
  }

  public static ngTemplateContextGuard<TData>(
    dir: BsRowTemplateDirective<TData>,
    ctx: any
  ): ctx is BsRowTemplateContext<Exclude<TData, false | 0 | '' | null | undefined>> {
    return true;
  }
}

export class BsRowTemplateContext<TData = unknown> {
  public $implicit: TData | undefined = undefined;
}
