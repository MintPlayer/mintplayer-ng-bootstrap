import { Directive } from '@angular/core';

@Directive({
  selector: '[bsColFormLabel]',
  host: {
    '[class.col-form-label]': 'true',
  },
})
export class BsColFormLabelDirective {
}
