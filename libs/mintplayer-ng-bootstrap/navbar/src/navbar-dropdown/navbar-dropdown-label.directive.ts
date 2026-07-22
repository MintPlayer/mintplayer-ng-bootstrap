import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks the trigger-label template for `<bs-navbar-dropdown>` — any HTML
 * (text, icon + text, badges, …). Rendered into the WC's trigger via
 * `ngTemplateOutlet`; the trigger's accessible name derives from this content,
 * so give an icon-only label an `aria-label`.
 *
 * ```html
 * <bs-navbar-dropdown>
 *   <span *bsNavbarDropdownLabel>Products</span>
 *   <bs-navbar-item><a routerLink="/p1">Product 1</a></bs-navbar-item>
 * </bs-navbar-dropdown>
 * ```
 */
@Directive({ selector: '[bsNavbarDropdownLabel]' })
export class BsNavbarDropdownLabelDirective {
  readonly templateRef = inject(TemplateRef);
}
