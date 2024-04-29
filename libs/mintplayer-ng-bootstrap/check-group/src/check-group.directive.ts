import { Directive, Input } from '@angular/core';

@Directive({
  selector: '[bsCheckGroup]',
  standalone: true,
})
export class BsCheckGroupDirective {
  @Input() name?: string;
}
