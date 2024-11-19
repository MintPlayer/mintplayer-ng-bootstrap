import { Directive, TemplateRef } from '@angular/core';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { BsSearchboxComponent } from '../searchbox/searchbox.component';

@Directive({
  selector: '[bsNoResultsTemplate]',
  standalone: false,
})
export class BsNoResultsTemplateDirective<T extends HasId<U>, U> {
  constructor(searchbox: BsSearchboxComponent<T, U>, template: TemplateRef<T>) {
    searchbox.noResultsTemplate = template;
  }
}
