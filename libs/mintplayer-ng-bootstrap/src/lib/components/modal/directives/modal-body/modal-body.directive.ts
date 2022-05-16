import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsModalBody]'
})
export class BsModalBodyDirective {

  @HostBinding('class.modal-body') bodyClass = true;

}
