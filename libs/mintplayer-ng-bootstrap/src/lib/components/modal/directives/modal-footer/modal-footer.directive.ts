import { Directive, TemplateRef } from '@angular/core';
import { BsModalComponent } from '../../component/modal/modal.component';

@Directive({
  selector: '[bsModalFooter]'
})
export class BsModalFooterDirective {

  constructor(modal: BsModalComponent, template: TemplateRef<any>) {
    modal.footer = template;
  }

}
