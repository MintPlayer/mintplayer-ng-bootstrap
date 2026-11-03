import { Directive } from '@angular/core';

/**
 * `[bsDropdownHeader]` — marks an element (an `<li>` or a heading) as a Bootstrap
 * `.dropdown-header` inside a `<bs-dropdown-menu>`. Styled by Bootstrap.
 * Usage: `<li bsDropdownHeader>Section</li>`.
 */
@Directive({
  selector: '[bsDropdownHeader]',
  host: {
    '[class.dropdown-header]': 'true',
    // The menu's scope: the dropdown part matches only DOM a component stamped (#452).
    'data-mps': 'dropdown-menu',
  },
})
export class BsDropdownHeaderDirective {}
