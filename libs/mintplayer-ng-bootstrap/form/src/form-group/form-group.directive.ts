import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsFormGroup]',
  standalone: false,
})
export class BsFormGroupDirective {
  @HostBinding('class.form-group') formGroupClass = true;
}
