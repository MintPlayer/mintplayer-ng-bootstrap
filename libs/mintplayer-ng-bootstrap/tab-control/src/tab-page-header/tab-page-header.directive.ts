import { Directive, inject, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsTabPageHeader]',
  standalone: false,
})
export class BsTabPageHeaderDirective {
  template = inject(TemplateRef);
}
