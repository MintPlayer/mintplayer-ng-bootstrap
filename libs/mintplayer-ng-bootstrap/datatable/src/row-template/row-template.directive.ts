import { ChangeDetectorRef, Directive, inject, Input, TemplateRef } from '@angular/core';
import { PaginationResponse } from '@mintplayer/pagination';
import { BsDatatableComponent } from '../datatable/datatable.component';

@Directive({
  selector: '[bsRowTemplate]',
  standalone: false,
})
export class BsRowTemplateDirective<TData> {

  private cdr = inject(ChangeDetectorRef);
  private datatableComponent = inject<BsDatatableComponent<TData>>(BsDatatableComponent);
  private templateRef = inject<TemplateRef<BsRowTemplateContext<TData>>>(TemplateRef);

  constructor() {
    this.datatableComponent.rowTemplate = this.templateRef;
  }

  @Input() set bsRowTemplateOf(value: PaginationResponse<TData> | undefined) {
    // Defer the data update to avoid ExpressionChangedAfterItHasBeenCheckedError
    // when data is loaded asynchronously after settings change
    queueMicrotask(() => {
      this.datatableComponent.data = value;
      this.cdr.markForCheck();
    });
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