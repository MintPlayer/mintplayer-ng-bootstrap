import { Directive, Input, TemplateRef } from '@angular/core';
import { PaginationResponse } from '@mintplayer/pagination';
import { BsDatatableComponent } from '../datatable/datatable.component';

@Directive({
  selector: '[bsRowTemplate]'
})
export class BsRowTemplateDirective<TData> {

  constructor(private datatableComponent: BsDatatableComponent<TData>, templateRef: TemplateRef<BsRowTemplateContext<TData>>) {
    this.datatableComponent.rowTemplate = templateRef;
  }

  @Input() set bsRowTemplateOf(value: PaginationResponse<TData> | undefined) {
    this.datatableComponent.data = value;
  }
  
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