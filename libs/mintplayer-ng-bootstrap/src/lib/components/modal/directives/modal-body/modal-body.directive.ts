import { Directive, TemplateRef } from '@angular/core';
import { BsModalComponent } from '../../component/modal/modal.component';

@Directive({
  selector: '[bsModalBody]'
})
export class BsModalBodyDirective {

  constructor(modal: BsModalComponent, template: TemplateRef<any>) {
    modal.body = template;
  }

}
