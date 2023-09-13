import { Directive, TemplateRef } from '@angular/core';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { BsSearchboxComponent } from '../searchbox/searchbox.component';

@Directive({
  selector: '[bsSuggestionTemplate]',
})
export class BsSuggestionTemplateDirective<T extends HasId<U>, U> {
  constructor(searchbox: BsSearchboxComponent<T, U>, template: TemplateRef<T>) {
    searchbox.suggestionTemplate = template;
  }
}
