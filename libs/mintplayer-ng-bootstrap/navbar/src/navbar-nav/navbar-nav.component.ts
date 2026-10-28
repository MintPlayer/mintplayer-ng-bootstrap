import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { useHostProps } from '@mintplayer/ng-bootstrap/machine';
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
  // Compiled from @mintplayer/ui-core/navbar's navbar-nav.view.vue (codegen); the root is the host.
  templateUrl: '../generated/navbar-nav.view.generated.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsNavbarNavComponent {
  /** Which side the group sits on: `start` (default) or `end`. */
  readonly align = input<'start' | 'end'>('start');

  protected readonly bag = computed(() => connectNavbarNav(this.align()));

  constructor() {
    useHostProps(() => this.bag());
  }
}
