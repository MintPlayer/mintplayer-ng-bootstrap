import { Directive, inject, TemplateRef } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModal]',
  standalone: false,
})
export class BsModalDirective {

  constructor() {
    const template = inject<TemplateRef<any>>(TemplateRef);
    const host = inject(BsModalHostComponent);
    host.template = template;
  }

}
