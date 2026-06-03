import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * `<bs-dropdown-wc-header>` — Angular wrapper around `<mp-dropdown-header>`.
 * The default slot is the header label.
 */
@Component({
  selector: 'bs-dropdown-wc-header',
  template: '<mp-dropdown-header><ng-content></ng-content></mp-dropdown-header>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsDropdownHeaderWc {}
