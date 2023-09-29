import { Directive, TemplateRef } from '@angular/core';
import { BsCloseComponent } from '../button/close.component';

@Directive({
  selector: '[bsContentTemplate]',
})
export class BsContentTemplateDirective {
  constructor(template: TemplateRef<any>, button: BsCloseComponent) {
    button.customTemplate = template;
  }
}
