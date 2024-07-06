import { Directive, input } from '@angular/core';

@Directive({
  selector: '[bsCheckboxGroup]',
  standalone: true,
})
export class BsCheckboxGroupDirective {
  name = input.required<string>();
}
