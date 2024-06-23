import { Directive, TemplateRef } from '@angular/core';
import { BsCardComponent } from '../card/card.component';

@Directive({
  selector: '[bsCardFooter]'
})
export class BsCardFooterDirective {
  constructor(card: BsCardComponent, template: TemplateRef<any>) {
    card.footerTemplate = template;
  }
}
