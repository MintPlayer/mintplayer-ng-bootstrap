import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { connectNavbarNav } from '@mintplayer/ui-core/navbar';

/**
 * `<bs-navbar-nav>` — a Bootstrap `.navbar-nav` group of items and dropdowns.
 *
 * `align="start"` (default) sits after the brand, `align="end"` is pushed to
 * the far edge when the bar is wide. Every `<bs-navbar-item>` and top-level
 * `<bs-navbar-dropdown>` belongs inside one.
 */
@Component({
  selector: 'bs-navbar-nav',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'bag()["class"]',
    '[attr.data-mps]': 'bag()["data-mps"]',
  },
})
export class BsNavbarNavComponent {
  /** Which side the group sits on: `start` (default) or `end`. */
  readonly align = input<'start' | 'end'>('start');

  protected readonly bag = computed(() => connectNavbarNav(this.align()));
}
