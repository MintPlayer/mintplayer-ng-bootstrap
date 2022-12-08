import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsPopoverHeader]'
})
export class BsPopoverHeaderDirective {

  @HostBinding('class.popover-header') headerClass = true;

}
