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
  },
})
export class BsDropdownHeaderDirective {}
