import { Directive, inject, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsTabPageHeader]',
  standalone: true,
})
export class BsTabPageHeaderDirective {
  template = inject(TemplateRef);
}
