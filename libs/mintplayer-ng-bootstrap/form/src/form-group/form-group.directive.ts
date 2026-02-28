import { Directive } from '@angular/core';

@Directive({
  selector: '[bsFormGroup]',
  host: {
    '[class.form-group]': 'true',
  },
})
export class BsFormGroupDirective {
}
