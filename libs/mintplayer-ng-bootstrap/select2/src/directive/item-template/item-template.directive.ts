import { Directive, TemplateRef } from '@angular/core';
import { BsSelect2Component } from '../../component/select2.component';
import { HasId } from '../../interfaces/has-id';

@Directive({
  selector: '[bsItemTemplate]'
})
export class BsItemTemplateDirective<T extends HasId> {

  constructor(private select2component: BsSelect2Component<T>, templateRef: TemplateRef<T>) {
    this.select2component.itemTemplate = templateRef;
  }

  public static ngTemplateContextGuard<T extends HasId>(dir: BsItemTemplateDirective<T>, ctx: any): ctx is BsItemTemplateContext<Exclude<T, false | 0 | '' | null | undefined>> {
    return true;
  }

}

export class BsItemTemplateContext<T extends HasId> {
  item: T = null!;
  select2: BsSelect2Component<T> = null!;
}