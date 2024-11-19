import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsModalHeader]',
  standalone: false,
})
export class BsModalHeaderDirective {

  @HostBinding('class.modal-header') headerClass = true;

}
