import { Directive } from '@angular/core';

/**
 * `[bsDropdownDivider]` — marks an element (typically an `<li>`) as a Bootstrap
 * `.dropdown-divider` inside a `<bs-dropdown-menu>`. Styled by the menu shadow's
 * `::slotted(.dropdown-divider)` rule. Usage: `<li bsDropdownDivider></li>`.
 */
@Directive({
  selector: '[bsDropdownDivider]',
  host: {
    '[class.dropdown-divider]': 'true',
    role: 'separator',
  },
})
export class BsDropdownDividerDirective {}
