import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsPopoverHeader]',
  standalone: false,
})
export class BsPopoverHeaderDirective {
  @HostBinding('class.popover-header') headerClass = true;
}
