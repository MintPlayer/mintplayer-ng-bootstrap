import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';

/**
 * `<bs-navbar-wc-item>` — Angular wrapper around `<mp-navbar-item>`.
 *
 * Wraps a consumer light-DOM link: project an `<a routerLink>` / `<a href>` (or
 * a `<button>`) as content; the WC styles it as a `.nav-link`. `active` /
 * `disabled` bridge to presence attributes.
 *
 * Distinct selector from the legacy `bs-navbar-item`
 * (`@mintplayer/ng-bootstrap/navbar`) to avoid a collision.
 */
@Component({
  selector: 'bs-navbar-wc-item',
  template: '<mp-navbar-item [attr.active]="activeAttr()" [attr.disabled]="disabledAttr()"><ng-content></ng-content></mp-navbar-item>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsNavbarItemWc {
  readonly active = input(false);
  readonly disabled = input(false);

  /** Presence attributes: `''` when set, `null` when absent. */
  protected readonly activeAttr = computed(() => (this.active() ? '' : null));
  protected readonly disabledAttr = computed(() => (this.disabled() ? '' : null));
}
