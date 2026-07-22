import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import { BS_DROPDOWN_MENU_CONTEXT, BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';

/**
 * `<bs-navbar-dropdown>` — Angular wrapper around `<mp-navbar-dropdown>`.
 *
 * The trigger text is the `label` input (rendered into the WC's `label` slot).
 * The dropdown panel (`<bs-dropdown-menu>`) is rendered internally — consumers
 * author the items directly between the tags, uniformly with the rest of the
 * navbar:
 *
 *     <bs-navbar-dropdown label="Basic">
 *       <bs-navbar-item><a routerLink="/basic/alert">Alert</a></bs-navbar-item>
 *       <bs-navbar-dropdown label="Forms">…</bs-navbar-dropdown>   <!-- submenu -->
 *     </bs-navbar-dropdown>
 *
 * `BS_DROPDOWN_MENU_CONTEXT` is provided here (element injectors follow the
 * consumer template's nesting, not the projection site — the internally
 * rendered menu is invisible to projected children's injectors), so nested
 * `<bs-navbar-item>`s render their `.dropdown-item` shape.
 * Reveal/positioning and the no-JS `:focus-within` fallback all live in the WC.
 */
@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [BsDropdownMenuComponent],
  providers: [{ provide: BS_DROPDOWN_MENU_CONTEXT, useValue: true }],
})
export class BsNavbarDropdownComponent {
  /** Text shown on the dropdown trigger. */
  readonly label = input<string>('');
}
