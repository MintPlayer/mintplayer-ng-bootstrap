import { Directive, TemplateRef } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModalBody]'
})
export class BsModalBodyDirective {

  constructor(modal: BsModalHostComponent, template: TemplateRef<any>) {
    modal.body = template;
  }

}
