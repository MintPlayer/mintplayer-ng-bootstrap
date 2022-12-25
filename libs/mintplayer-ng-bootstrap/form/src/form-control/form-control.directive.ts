import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: 'bs-form input:not(.no-form-control), bs-form textarea:not(.no-form-control)'
})
export class BsFormControlDirective {
  @HostBinding('class.form-control') formControlClass = true;
}
