import { Directive } from '@angular/core';

@Directive({
  selector: '[bsFormGroup]',
  standalone: false,
  host: {
    '[class.form-group]': 'true',
  },
})
export class BsFormGroupDirective {
}
