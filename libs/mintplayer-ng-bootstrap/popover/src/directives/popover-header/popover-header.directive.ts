import { Directive } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapPopover } from '@mintplayer/ui-core/bootstrap';

@Directive({
  selector: '[bsPopoverHeader]',
  host: {
    '[attr.data-mps]': '"popover"',
    '[class.popover-header]': 'true',
  },
})
export class BsPopoverHeaderDirective {
  constructor() {
    // #452: the popover partial ships with this component, scoped to the elements it stamps (data-mps="popover").
    useBootstrap(bootstrapPopover);
  }

}
