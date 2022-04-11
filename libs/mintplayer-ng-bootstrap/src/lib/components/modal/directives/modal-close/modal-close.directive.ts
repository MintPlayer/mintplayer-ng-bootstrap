import { Directive, HostListener } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModalClose]'
})
export class BsModalCloseDirective {

  constructor(private modal: BsModalHostComponent) { }

  @HostListener('click', ['$event'])
  onClick(ev: MouseEvent) {
    this.modal.isOpen = false;
  }

}
