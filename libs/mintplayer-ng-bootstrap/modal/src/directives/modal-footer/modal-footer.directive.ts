import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsModalFooter]',
  standalone: false,
})
export class BsModalFooterDirective {
  @HostBinding('class.modal-footer') footerClass = true;
}
