import { Directive, TemplateRef } from '@angular/core';
import { BsSelect2Component } from '../../component/select2.component';
import { HasId } from '../../interfaces/has-id';

@Directive({
  selector: '[bsSuggestionTemplate]',
})
export class BsSuggestionTemplateDirective<T extends HasId> {
  constructor(private select2component: BsSelect2Component<T>, templateRef: TemplateRef<T>) {
    this.select2component.itemTemplate = templateRef;
  }

  public static ngTemplateContextGuard<T extends HasId>(dir: BsSuggestionTemplateDirective<T>, ctx: any): ctx is BsSuggestionTemplateContext<Exclude<T, false | 0 | '' | null | undefined>> {
    return true;
  }
}

export class BsSuggestionTemplateContext<T extends HasId> {
  item: T = null!;
  select2: BsSelect2Component<T> = null!;
}