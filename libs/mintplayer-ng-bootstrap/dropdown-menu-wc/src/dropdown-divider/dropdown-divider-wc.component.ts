import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * `<bs-dropdown-wc-divider>` — Angular wrapper around `<mp-dropdown-divider>`.
 * No attributes; a separator between groups of items.
 */
@Component({
  selector: 'bs-dropdown-wc-divider',
  template: '<mp-dropdown-divider></mp-dropdown-divider>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsDropdownDividerWc {}
