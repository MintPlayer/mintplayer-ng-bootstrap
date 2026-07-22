import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';

/**
 * `<bs-navbar-dropdown>` — Angular wrapper around `<mp-navbar-dropdown>`.
 *
 * The trigger text is the `label` input (rendered into the WC's `label` slot).
 * The dropdown panel is projected into the default slot — supply a
 * `<bs-dropdown-menu>` (`@mintplayer/ng-bootstrap/dropdown-menu`) of link items.
 * Nest another `<bs-navbar-dropdown>` inside that menu to make a submenu.
 * Reveal/positioning and the no-JS `:focus-within` fallback all live in the WC.
 */
@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsNavbarDropdownComponent {
  /** Text shown on the dropdown trigger. */
  readonly label = input<string>('');
}
