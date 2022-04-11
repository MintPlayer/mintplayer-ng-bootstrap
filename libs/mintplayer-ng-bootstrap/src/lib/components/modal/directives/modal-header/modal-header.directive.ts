import { Directive, TemplateRef } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModalHeader]'
})
export class BsModalHeaderDirective {

  constructor(modal: BsModalHostComponent, template: TemplateRef<any>) {
    modal.header = template;
  }

}
