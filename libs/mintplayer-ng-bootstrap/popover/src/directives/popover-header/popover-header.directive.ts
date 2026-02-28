import { Directive } from '@angular/core';

@Directive({
  selector: '[bsPopoverHeader]',
  standalone: true,
  host: {
    '[class.popover-header]': 'true',
  },
})
export class BsPopoverHeaderDirective {
}
