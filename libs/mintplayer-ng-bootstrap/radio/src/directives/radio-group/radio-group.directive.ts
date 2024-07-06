import { Directive, input } from '@angular/core';

@Directive({
  selector: '[bsRadioGroup]',
  standalone: true,
})
export class BsRadioGroupDirective {
  name = input.required<string>();
}
