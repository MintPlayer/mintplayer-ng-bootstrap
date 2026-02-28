import { Directive, inject, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsHeaderTemplate]',
})
export class BsHeaderTemplateDirective<T> {

  constructor() {
    const template = inject(TemplateRef);
    const multiselect = inject<BsMultiselectComponent<T>>(BsMultiselectComponent);
    multiselect.headerTemplate = template;
  }

}
