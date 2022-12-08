import { Directive, HostListener } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModalClose]'
})
export class BsModalCloseDirective {

  constructor(private host: BsModalHostComponent) { }

  @HostListener('click') onClick() {
    this.host.isOpen = false;
  }
}
