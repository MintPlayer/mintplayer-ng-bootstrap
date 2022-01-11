import { Directive, TemplateRef } from '@angular/core';
import { BsModalComponent } from '../../component/modal/modal.component';

@Directive({
  selector: '[bsModalHeader]'
})
export class BsModalHeaderDirective {

  constructor(modal: BsModalComponent, template: TemplateRef<any>) {
    modal.header = template;
  }

}
