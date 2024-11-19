import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsTabPageHeader]',
  standalone: false,
})
export class BsTabPageHeaderDirective {
  constructor(public template: TemplateRef<any>) {}
}
