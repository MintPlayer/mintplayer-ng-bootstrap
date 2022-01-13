import { Directive, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsFooterTemplate]'
})
export class BsFooterTemplateDirective {

  constructor(template: TemplateRef<any>, multiselect: BsMultiselectComponent) {
    multiselect.footerTemplate = template;
  }

}
