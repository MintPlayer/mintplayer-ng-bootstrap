import { Directive } from '@angular/core';

@Directive({
  selector: '[bsPopoverBody]',
  host: {
    '[class.popover-body]': 'true',
  },
})
export class BsPopoverBodyDirective {
}
