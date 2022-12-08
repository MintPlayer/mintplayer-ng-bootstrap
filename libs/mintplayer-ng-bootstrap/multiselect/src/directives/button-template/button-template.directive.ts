import { Directive, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsButtonTemplate]'
})
export class BsButtonTemplateDirective {

  constructor(template: TemplateRef<any>, multiselect: BsMultiselectComponent) {
    multiselect.buttonTemplate = template;
  }

}
