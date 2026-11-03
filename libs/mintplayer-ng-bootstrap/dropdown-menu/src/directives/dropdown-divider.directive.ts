import { Directive } from '@angular/core';

/**
 * `[bsDropdownDivider]` — marks an element (typically an `<li>`) as a Bootstrap
 * `.dropdown-divider` inside a `<bs-dropdown-menu>`. Styled by Bootstrap.
 * Usage: `<li bsDropdownDivider></li>`.
 */
@Directive({
  selector: '[bsDropdownDivider]',
  host: {
    '[class.dropdown-divider]': 'true',
    // The menu's scope: the dropdown part matches only DOM a component stamped (#452).
    'data-mps': 'dropdown-menu',
    role: 'separator',
  },
})
export class BsDropdownDividerDirective {}
