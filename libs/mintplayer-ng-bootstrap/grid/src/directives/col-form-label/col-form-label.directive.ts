import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsColFormLabel]'
})
export class BsColFormLabelDirective {
  @HostBinding('class.col-form-label') colFormLabelClass = true;
}
