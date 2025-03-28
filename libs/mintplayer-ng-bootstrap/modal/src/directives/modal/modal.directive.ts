import { Directive, TemplateRef } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModal]',
  standalone: false,
})
export class BsModalDirective {

  constructor(template: TemplateRef<any>, host: BsModalHostComponent) {
    host.template = template;
  }
  
}
