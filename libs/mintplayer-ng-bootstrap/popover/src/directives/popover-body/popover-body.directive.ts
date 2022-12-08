import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsPopoverBody]'
})
export class BsPopoverBodyDirective {

  @HostBinding('class.popover-body') bodyClass = true;

}
