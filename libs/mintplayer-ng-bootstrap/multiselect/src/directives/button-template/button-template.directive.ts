import { Directive, TemplateRef } from '@angular/core';
import { BsMultiselectComponent } from '../../component/multiselect.component';

@Directive({
  selector: '[bsButtonTemplate]'
})
export class BsButtonTemplateDirective<T> {

  constructor(template: TemplateRef<any>, multiselect: BsMultiselectComponent<T>) {
    multiselect.buttonTemplate = template;
  }

}
