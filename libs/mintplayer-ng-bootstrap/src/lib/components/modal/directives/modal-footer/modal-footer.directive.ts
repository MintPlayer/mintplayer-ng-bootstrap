import { Directive, TemplateRef } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModalFooter]'
})
export class BsModalFooterDirective {

  constructor(modal: BsModalHostComponent, template: TemplateRef<any>) {
    modal.footer = template;
  }

}
