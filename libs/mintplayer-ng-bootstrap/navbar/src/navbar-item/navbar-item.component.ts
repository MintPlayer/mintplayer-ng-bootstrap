import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { BS_DROPDOWN_MENU_CONTEXT } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { connectNavbarItem } from '@mintplayer/ui-core/navbar';

/**
 * `<bs-navbar-item>` — one navbar entry, uniform at every nesting level.
 *
 * Project an `<a routerLink>` / `<a href>` (or a `<button>`). The host is a
 * `.nav-item` in a `<bs-navbar-nav>` and a `.dropdown-item` inside a
 * `<bs-navbar-dropdown>` (detected via `BS_DROPDOWN_MENU_CONTEXT`); the link
 * stays its direct child, which is what the navbar sheet styles.
 *
 * `active` marks the current page (`aria-current`); `disabled` greys the
 * entry out and sets `aria-disabled`.
 */
@Component({
  selector: 'bs-navbar-item',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'bag()["class"]',
    '[attr.data-mps]': 'bag()["data-mps"]',
    '[attr.aria-disabled]': 'bag()["aria-disabled"]',
    '[attr.aria-current]': 'bag()["aria-current"]',
  },
})
export class BsNavbarItemComponent {
  readonly active = input(false);
  readonly disabled = input(false);

  /** Menu shape when authored inside a dropdown; fixed per instance. */
  private readonly inMenu = inject(BS_DROPDOWN_MENU_CONTEXT, { optional: true }) ?? false;

  protected readonly bag = computed(() =>
    connectNavbarItem({ inMenu: this.inMenu, active: this.active(), disabled: this.disabled() }),
  );
}
