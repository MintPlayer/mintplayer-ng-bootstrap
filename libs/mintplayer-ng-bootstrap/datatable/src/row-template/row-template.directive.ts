import { Directive, effect, inject, input, TemplateRef } from '@angular/core';
import { PaginationResponse } from '@mintplayer/pagination';
import { BsDatatableComponent } from '../datatable/datatable.component';

@Directive({
  selector: '[bsRowTemplate]',
})
export class BsRowTemplateDirective<TData> {

  private datatableComponent = inject<BsDatatableComponent<TData>>(BsDatatableComponent);
  private templateRef = inject<TemplateRef<BsRowTemplateContext<TData>>>(TemplateRef);

  constructor() {
    this.datatableComponent.rowTemplate = this.templateRef;

    effect(() => {
      const value = this.bsRowTemplateOf();
      this.datatableComponent.data.set(value);
    });
  }

  readonly bsRowTemplateOf = input<PaginationResponse<TData> | undefined>(undefined);

  public static ngTemplateContextGuard<TData>(
    dir: BsRowTemplateDirective<TData>,
    ctx: any
  ): ctx is BsRowTemplateContext<Exclude<TData, false | 0 | '' | null | undefined>> {
    return true;
  }
}

export class BsRowTemplateContext<TData = unknown> {
  public $implicit: TData = null!;
}