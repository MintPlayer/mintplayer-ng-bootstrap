import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks the brand template of `<bs-navbar>` — a link, text or a logo. The
 * navbar renders it first in the bar, inside Bootstrap's `.navbar-brand`.
 *
 * ```html
 * <bs-navbar>
 *   <a *bsNavbarBrand routerLink="/">MyApp</a>
 *   …
 * </bs-navbar>
 * ```
 */
@Directive({ selector: '[bsNavbarBrand]' })
export class BsNavbarBrandDirective {
  readonly templateRef = inject(TemplateRef);
}
