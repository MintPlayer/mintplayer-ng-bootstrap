import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsPopoverHeader]'
})
export class BsPopoverHeaderDirective {

  constructor() { }

  @HostBinding('class.popover-header') headerClass = true;

}
