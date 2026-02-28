import { Directive } from '@angular/core';

@Directive({
  selector: '[bsDropdownDivider]',
  host: {
    '[class.dropdown-divider]': 'true',
  },
})
export class BsDropdownDividerDirective {
}
