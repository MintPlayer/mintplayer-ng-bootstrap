import { Directive, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsHeaderTemplate]',
  standalone: false,
})
export class BsHeaderTemplateDirective<T> {

  constructor(template: TemplateRef<any>, multiselect: BsMultiselectComponent<T>) {
    multiselect.headerTemplate = template;
  }

}
