import { Directive } from '@angular/core';

@Directive({
  selector: '[bsPopoverHeader]',
  standalone: false,
  host: {
    '[class.popover-header]': 'true',
  },
})
export class BsPopoverHeaderDirective {
}
