import { Directive } from '@angular/core';

@Directive({
  selector: '[bsDropdownDivider]',
  standalone: true,
  host: {
    '[class.dropdown-divider]': 'true',
  },
})
export class BsDropdownDividerDirective {
}
