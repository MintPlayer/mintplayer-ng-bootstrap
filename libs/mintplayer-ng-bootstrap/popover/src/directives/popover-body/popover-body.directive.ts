import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsPopoverBody]',
  standalone: false,
})
export class BsPopoverBodyDirective {
  @HostBinding('class.popover-body') bodyClass = true;
}
