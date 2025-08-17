import { Directive, HostListener, inject } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModalClose]',
  standalone: false,
})
export class BsModalCloseDirective {

  host = inject(BsModalHostComponent);

  @HostListener('click') onClick() {
    this.host.isOpen = false;
  }
}
