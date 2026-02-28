import { Directive, inject } from '@angular/core';
import { BsFormComponent } from '../form/form.component';

@Directive({
  selector: 'bs-form input:not(.no-form-control), bs-form textarea:not(.no-form-control)',
  standalone: false,
  host: {
    '[class.form-control]': 'formControlClass',
  },
})
export class BsFormControlDirective {
  private form = inject(BsFormComponent, { optional: true });
  formControlClass = !!this.form;
}
