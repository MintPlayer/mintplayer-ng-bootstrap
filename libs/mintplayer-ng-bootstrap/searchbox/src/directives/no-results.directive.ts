import { Directive, inject, TemplateRef } from '@angular/core';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { BsSearchboxComponent } from '../searchbox/searchbox.component';

@Directive({
  selector: '[bsNoResultsTemplate]',
  standalone: false,
})
export class BsNoResultsTemplateDirective<T extends HasId<U>, U> {
  constructor() {
    const searchbox = inject<BsSearchboxComponent<T, U>>(BsSearchboxComponent);
    const template = inject<TemplateRef<T>>(TemplateRef);
    searchbox.noResultsTemplate = template;
  }
}
