import { Directive, TemplateRef } from '@angular/core';
import { BsSelect2Component } from '../component/select2.component';

@Directive({
  selector: '[bsItemTemplate]'
})
export class BsItemTemplateDirective<T> {

  constructor(private select2component: BsSelect2Component, templateRef: TemplateRef<T>) {
    this.select2component.itemTemplate = templateRef;
  }

  public static ngTemplateContextGuard<T>(dir: BsItemTemplateDirective<T>, ctx: any): ctx is BsItemTemplateContext<Exclude<T, false | 0 | '' | null | undefined>> {
    return true;
  }

}

export class BsItemTemplateContext<T = unknown> {
  item: T = null!;
  select2: BsSelect2Component = null!;
}