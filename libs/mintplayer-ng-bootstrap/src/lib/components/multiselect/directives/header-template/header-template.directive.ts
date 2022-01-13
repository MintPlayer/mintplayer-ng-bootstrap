import { Directive, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsHeaderTemplate]'
})
export class BsHeaderTemplateDirective {

  constructor(template: TemplateRef<any>, multiselect: BsMultiselectComponent) {
    multiselect.headerTemplate = template;
  }

}
