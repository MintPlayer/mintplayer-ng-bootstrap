import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsPopoverBody]'
})
export class BsPopoverBodyDirective {

  constructor() { }

  @HostBinding('class.popover-body') bodyClass = true;

}
