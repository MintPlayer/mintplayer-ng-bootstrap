import { Directive } from '@angular/core';

@Directive({
  selector: '[bsFormGroup]',
  standalone: true,
  host: {
    '[class.form-group]': 'true',
  },
})
export class BsFormGroupDirective {
}
