import { Directive } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapForms } from '@mintplayer/ui-core/bootstrap';

/**
 * Puts Bootstrap's `.col-form-label` on the element, stamps it (`data-mps`)
 * and installs the forms part that styles it (#452).
 */
@Directive({
  selector: '[bsColFormLabel]',
  host: {
    '[class.col-form-label]': 'true',
    '[attr.data-mps]': '"grid"',
  },
})
export class BsColFormLabelDirective {
  constructor() {
    useBootstrap(bootstrapForms);
  }
}
