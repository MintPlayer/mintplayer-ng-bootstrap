import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsTabPageHeader]'
})
export class BsTabPageHeaderDirective {

  constructor(public template: TemplateRef<any>) {}

}
