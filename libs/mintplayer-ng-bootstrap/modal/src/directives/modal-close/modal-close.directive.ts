import { Directive, HostListener } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModalClose]',
  standalone: false,
})
export class BsModalCloseDirective {

  constructor(private host: BsModalHostComponent) { }

  @HostListener('click') onClick() {
    this.host.isOpen.set(false);
  }
}
