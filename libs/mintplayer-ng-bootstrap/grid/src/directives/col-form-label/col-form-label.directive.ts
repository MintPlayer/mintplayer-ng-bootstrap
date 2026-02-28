import { Directive } from '@angular/core';

@Directive({
  selector: '[bsColFormLabel]',
  standalone: true,
  host: {
    '[class.col-form-label]': 'true',
  },
})
export class BsColFormLabelDirective {
}
