import { Directive, HostBinding, inject, Optional } from '@angular/core';
import { BsFormComponent } from '../form/form.component';

@Directive({
  selector: 'bs-form input:not(.no-form-control), bs-form textarea:not(.no-form-control)',
  standalone: false,
})
export class BsFormControlDirective {
  @HostBinding('class.form-control') formControlClass = inject(BsFormComponent, { optional: true }) != null;
}
