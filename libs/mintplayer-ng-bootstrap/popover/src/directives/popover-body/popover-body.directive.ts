import { Directive } from '@angular/core';

@Directive({
  selector: '[bsPopoverBody]',
  standalone: true,
  host: {
    '[class.popover-body]': 'true',
  },
})
export class BsPopoverBodyDirective {
}
