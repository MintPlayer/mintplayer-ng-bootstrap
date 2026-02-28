import { Directive } from '@angular/core';

@Directive({
  selector: '[bsColFormLabel]',
  standalone: false,
  host: {
    '[class.col-form-label]': 'true',
  },
})
export class BsColFormLabelDirective {
}
