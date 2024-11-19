import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsModalBody]',
  standalone: false,
})
export class BsModalBodyDirective {

  @HostBinding('class.modal-body') bodyClass = true;

}
