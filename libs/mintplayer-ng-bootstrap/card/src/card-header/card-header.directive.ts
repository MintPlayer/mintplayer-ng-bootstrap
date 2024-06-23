import { Directive, TemplateRef } from '@angular/core';
import { BsCardComponent } from '../card/card.component';

@Directive({
  selector: '[bsCardHeader]',
})
export class BsCardHeaderDirective {
  constructor(card: BsCardComponent, template: TemplateRef<any>) {
    card.headerTemplate = template;
  }
}
