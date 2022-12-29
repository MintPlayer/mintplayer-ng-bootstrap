import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsFormGroup]'
})
export class BsFormGroupDirective {
  @HostBinding('class.form-group') formGroupClass = true;
}
