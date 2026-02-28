import { Directive, Optional } from '@angular/core';
import { BsFormComponent } from '../form/form.component';

@Directive({
  selector: 'bs-form input:not(.no-form-control), bs-form textarea:not(.no-form-control)',
  standalone: false,
  host: {
    '[class.form-control]': 'formControlClass',
  },
})
export class BsFormControlDirective {
  constructor(@Optional() form?: BsFormComponent) {
    this.formControlClass = !!form;
  }
  formControlClass: boolean;
}
