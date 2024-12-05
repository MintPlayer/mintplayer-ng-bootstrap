import { Directive, TemplateRef } from '@angular/core';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { BsSearchboxComponent } from '../searchbox/searchbox.component';

@Directive({
  selector: '[bsEnterSearchTermTemplate]',
  standalone: false,
})
export class BsEnterSearchTermTemplateDirective<T extends HasId<U>, U> {
  constructor(searchbox: BsSearchboxComponent<T, U>, template: TemplateRef<T>) {
    searchbox.enterSearchtermTemplate = template;
  }
}
