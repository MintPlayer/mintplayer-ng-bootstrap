import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * `<bs-navbar-brand>` — Angular wrapper around `<mp-navbar-brand>`.
 *
 * Project an `<a routerLink>` / text as the brand. The host sets
 * `slot="brand"` so the wrapper element lands in `<mp-navbar>`'s `brand` slot
 * (mirrors `BsShellSidebarDirective`, which sets `slot="sidebar"`).
 */
@Component({
  selector: 'bs-navbar-brand',
  template: '<mp-navbar-brand><ng-content></ng-content></mp-navbar-brand>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.slot]': "'brand'",
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsNavbarBrandComponent {}
