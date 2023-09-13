import { Directive, Input, TemplateRef } from '@angular/core';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { BsSearchboxComponent } from '../searchbox/searchbox.component';

@Directive({
  selector: '[bsSuggestionTemplate]',
})
export class BsSuggestionTemplateDirective<TData extends HasId<U>, U> {
  constructor(private searchbox: BsSearchboxComponent<TData, U>, template: TemplateRef<BsSuggestionTemplateContext<TData, U>>) {
    searchbox.suggestionTemplate = template;
  }
  
  public static ngTemplateContextGuard<TData extends HasId<U>, U>(
    dir: BsSuggestionTemplateDirective<TData, U>,
    ctx: any
  ): ctx is BsSuggestionTemplateContext<Exclude<TData, false | 0 | '' | null | undefined>, U> {
    return true;
  }

  @Input() set bsSuggestionTemplateOf(value: TData[]) {
    this.searchbox.suggestions = value;
  }
}

export class BsSuggestionTemplateContext<TData extends HasId<U>, U> {
  public $implicit: TData = null!;
  public searchbox: BsSearchboxComponent<TData, U> = null!;
}