import { Directive, inject, Input, TemplateRef } from '@angular/core';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { BsSearchboxComponent } from '../searchbox/searchbox.component';

@Directive({
  selector: '[bsSuggestionTemplate]',
  standalone: false,
})
export class BsSuggestionTemplateDirective<TData extends HasId<U>, U> {
  private searchbox = inject<BsSearchboxComponent<TData, U>>(BsSearchboxComponent);

  constructor() {
    const template = inject<TemplateRef<BsSuggestionTemplateContext<TData, U>>>(TemplateRef);
    this.searchbox.suggestionTemplate = template;
  }
  
  public static ngTemplateContextGuard<TData extends HasId<U>, U>(
    dir: BsSuggestionTemplateDirective<TData, U>,
    ctx: any
  ): ctx is BsSuggestionTemplateContext<Exclude<TData, false | 0 | '' | null | undefined>, U> {
    return true;
  }

  @Input() set bsSuggestionTemplateOf(value: TData[]) {
    this.searchbox.suggestions.set(value);
  }
}

export class BsSuggestionTemplateContext<TData extends HasId<U>, U> {
  public $implicit: TData = null!;
  public searchbox: BsSearchboxComponent<TData, U> = null!;
}