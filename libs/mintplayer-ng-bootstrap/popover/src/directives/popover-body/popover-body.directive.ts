import { Directive } from '@angular/core';

@Directive({
  selector: '[bsPopoverBody]',
  standalone: false,
  host: {
    '[class.popover-body]': 'true',
  },
})
export class BsPopoverBodyDirective {
}
