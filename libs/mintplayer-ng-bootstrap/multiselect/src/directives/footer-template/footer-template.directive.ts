import { Directive, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsFooterTemplate]',
  standalone: false,
})
export class BsFooterTemplateDirective<T> {

  constructor(template: TemplateRef<any>, multiselect: BsMultiselectComponent<T>) {
    multiselect.footerTemplate = template;
  }

}
