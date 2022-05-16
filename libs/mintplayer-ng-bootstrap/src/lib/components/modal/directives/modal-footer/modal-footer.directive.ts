import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsModalFooter]'
})
export class BsModalFooterDirective {

  @HostBinding('class.modal-footer') footerClass = true;

}
