import { Directive, inject, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsTabPageHeader]',
})
export class BsTabPageHeaderDirective {
  template = inject(TemplateRef);
}
