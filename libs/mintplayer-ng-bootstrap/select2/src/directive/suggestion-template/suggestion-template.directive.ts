import { Directive, inject, Input, TemplateRef } from '@angular/core';
import { BsSelect2Component } from '../../component/select2.component';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';

@Directive({
  selector: '[bsSuggestionTemplate]',
  standalone: false,
})
export class BsSuggestionTemplateDirective<T extends HasId<U>, U> {
  private select2component = inject<BsSelect2Component<T, U>>(BsSelect2Component);

  constructor() {
    const templateRef = inject<TemplateRef<T>>(TemplateRef);
    this.select2component.suggestionTemplate = templateRef;
  }

  public static ngTemplateContextGuard<T extends HasId<U>, U>(dir: BsSuggestionTemplateDirective<T, U>, ctx: any): ctx is BsSuggestionTemplateContext<Exclude<T, false | 0 | '' | null | undefined>, U> {
    return true;
  }

  @Input() set bsSuggestionTemplateOf(value: T[]) {
    this.select2component.suggestions = value;
  }
}

export class BsSuggestionTemplateContext<T extends HasId<U>, U> {
  $implicit: T = null!;
  select2: BsSelect2Component<T, U> = null!;
}