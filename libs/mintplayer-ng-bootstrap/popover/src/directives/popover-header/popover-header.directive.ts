import { Directive } from '@angular/core';

@Directive({
  selector: '[bsPopoverHeader]',
  host: {
    '[class.popover-header]': 'true',
  },
})
export class BsPopoverHeaderDirective {
}
