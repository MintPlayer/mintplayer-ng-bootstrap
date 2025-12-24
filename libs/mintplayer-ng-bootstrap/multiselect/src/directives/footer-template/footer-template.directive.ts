import { Directive, inject, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsFooterTemplate]',
  standalone: false,
})
export class BsFooterTemplateDirective<T> {

  constructor() {
    const template = inject(TemplateRef);
    const multiselect = inject<BsMultiselectComponent<T>>(BsMultiselectComponent);
    multiselect.footerTemplate = template;
  }

}
