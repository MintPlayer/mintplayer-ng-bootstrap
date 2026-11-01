import { Directive } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapForms } from '@mintplayer/ui-core/bootstrap';

@Directive({
  selector: '[bsColFormLabel]',
  host: {
    '[class.col-form-label]': 'true',
  },
})
export class BsColFormLabelDirective {
  // Bootstrap's forms CSS ships with the directive, not page-wide (#452).
  constructor() {
    useBootstrap(bootstrapForms);
  }
}
