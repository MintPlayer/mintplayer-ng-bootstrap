import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * `<bs-navbar-wc-brand>` — Angular wrapper around `<mp-navbar-brand>`.
 *
 * Project an `<a routerLink>` / text as the brand. The host sets
 * `slot="brand"` so the wrapper element lands in `<mp-navbar>`'s `brand` slot
 * (mirrors `BsShellSidebarDirective`, which sets `slot="sidebar"`).
 *
 * Distinct selector from the legacy `bs-navbar-brand`
 * (`@mintplayer/ng-bootstrap/navbar`) to avoid a collision.
 */
@Component({
  selector: 'bs-navbar-wc-brand',
  template: '<mp-navbar-brand><ng-content></ng-content></mp-navbar-brand>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.slot]': "'brand'",
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsNavbarBrandWc {}
