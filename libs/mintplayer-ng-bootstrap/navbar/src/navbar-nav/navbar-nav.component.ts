import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `<bs-navbar-nav>` — groups navbar items into one of the WC's two nav lists.
 *
 * `align="start"` (default) joins the left list, `align="end"` the list pushed
 * to the far edge in wide mode. The host is `display: contents`, so the grouped
 * `<bs-navbar-item>` / `<bs-navbar-dropdown>` children flatten into the WC's
 * `.navbar-nav` flex layout exactly like directly-slotted items — the same
 * mechanism `<mp-navbar>` itself uses for its slots. The WC slot name stays an
 * internal detail (mirrors `bs-navbar-brand` hiding `slot="brand"`).
 *
 * `display: contents` MUST stay static CSS (never applied via JS) so the no-JS
 * SSR path lays out identically from first paint.
 */
@Component({
  selector: 'bs-navbar-nav',
  template: '<ng-content></ng-content>',
  styles: ':host { display: contents; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.slot]': 'slotAttr()',
  },
})
export class BsNavbarNavComponent {
  /** Which nav group the items join: `start` (default) or `end` (pushed to the far edge in wide mode). */
  readonly align = input<'start' | 'end'>('start');

  protected readonly slotAttr = computed(() => (this.align() === 'end' ? 'end' : null));
}
