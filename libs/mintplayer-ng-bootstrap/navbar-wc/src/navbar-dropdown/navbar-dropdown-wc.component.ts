import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';

/**
 * `<bs-navbar-wc-dropdown>` — Angular wrapper around `<mp-navbar-dropdown>`.
 *
 * The trigger text is the `label` input (rendered into the WC's `label` slot).
 * The dropdown panel is projected into the default slot — supply a
 * `<bs-dropdown-menu>` (`@mintplayer/ng-bootstrap/dropdown-menu`) of link items.
 * Reveal/positioning and the no-JS `:focus-within` fallback all live in the WC.
 *
 * Distinct selector from the legacy `bs-navbar-dropdown`
 * (`@mintplayer/ng-bootstrap/navbar`) to avoid a collision.
 */
@Component({
  selector: 'bs-navbar-wc-dropdown',
  templateUrl: './navbar-dropdown-wc.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsNavbarDropdownWc {
  /** Text shown on the dropdown trigger. */
  readonly label = input<string>('');
}
