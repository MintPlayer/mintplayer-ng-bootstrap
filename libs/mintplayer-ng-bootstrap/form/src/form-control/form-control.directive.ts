import { Directive, HostBinding, Optional } from '@angular/core';
import { BsFormComponent } from '../form/form.component';

@Directive({
  selector: 'bs-form input:not(.no-form-control), bs-form textarea:not(.no-form-control)'
})
export class BsFormControlDirective {
  constructor(@Optional() form?: BsFormComponent) {
    this.formControlClass = !!form;
  }
  @HostBinding('class.form-control') formControlClass: boolean;
}
