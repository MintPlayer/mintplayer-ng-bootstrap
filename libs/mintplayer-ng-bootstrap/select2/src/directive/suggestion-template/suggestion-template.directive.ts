import { Directive, TemplateRef } from '@angular/core';
import { BsSelect2Component } from '../../component/select2.component';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';

@Directive({
  selector: '[bsSuggestionTemplate]',
})
export class BsSuggestionTemplateDirective<T extends HasId<U>, U> {
  constructor(private select2component: BsSelect2Component<T, U>, templateRef: TemplateRef<T>) {
    this.select2component.itemTemplate = templateRef;
  }

  public static ngTemplateContextGuard<T extends HasId<U>, U>(dir: BsSuggestionTemplateDirective<T, U>, ctx: any): ctx is BsSuggestionTemplateContext<Exclude<T, false | 0 | '' | null | undefined>, U> {
    return true;
  }
}

export class BsSuggestionTemplateContext<T extends HasId<U>, U> {
  item: T = null!;
  select2: BsSelect2Component<T, U> = null!;
}