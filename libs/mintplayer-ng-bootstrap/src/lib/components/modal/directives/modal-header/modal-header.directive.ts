import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsModalHeader]'
})
export class BsModalHeaderDirective {

  @HostBinding('class.modal-header') headerClass = true;

}
