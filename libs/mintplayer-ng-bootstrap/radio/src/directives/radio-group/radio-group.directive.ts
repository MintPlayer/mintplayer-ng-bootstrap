import { Directive, input } from '@angular/core';

@Directive({
  selector: '[bsRadioGroup]',
})
export class BsRadioGroupDirective {
  name = input.required<string>();
}
