import { Directive, effect, inject, input, TemplateRef } from '@angular/core';
import { BsSelect2Component } from '../../component/select2.component';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';

@Directive({
  selector: '[bsSuggestionTemplate]',
})
export class BsSuggestionTemplateDirective<T extends HasId<U>, U> {
  private select2component = inject<BsSelect2Component<T, U>>(BsSelect2Component);

  constructor() {
    const templateRef = inject<TemplateRef<T>>(TemplateRef);
    this.select2component.suggestionTemplate = templateRef;

    effect(() => {
      const value = this.bsSuggestionTemplateOf();
      if (value) {
        this.select2component.suggestions.set(value);
      }
    });
  }

  public static ngTemplateContextGuard<T extends HasId<U>, U>(dir: BsSuggestionTemplateDirective<T, U>, ctx: any): ctx is BsSuggestionTemplateContext<Exclude<T, false | 0 | '' | null | undefined>, U> {
    return true;
  }

  readonly bsSuggestionTemplateOf = input<T[] | undefined>(undefined);
}

export class BsSuggestionTemplateContext<T extends HasId<U>, U> {
  $implicit: T = null!;
  select2: BsSelect2Component<T, U> = null!;
}