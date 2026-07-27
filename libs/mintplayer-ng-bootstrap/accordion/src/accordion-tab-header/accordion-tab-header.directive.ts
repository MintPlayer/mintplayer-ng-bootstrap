import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * `*bsAccordionTabHeader` — declares the header content of the enclosing
 * `<bs-accordion-tab>`.
 *
 * It is a template rather than projected content because the header has to
 * end up as a direct child of `<mp-accordion>` (named slots accept nothing
 * else) while being authored inside the tab it belongs to. The parent
 * accordion renders each captured template into the matching header slot.
 *
 * Mirrors `*bsTabPageHeader` on `bs-tab-control`. Replaces the former
 * `<bs-accordion-tab-header>` component.
 *
 *     <bs-accordion>
 *       <bs-accordion-tab>
 *         <ng-container *bsAccordionTabHeader>Profile</ng-container>
 *         Body content here
 *       </bs-accordion-tab>
 *     </bs-accordion>
 */
@Directive({
  selector: '[bsAccordionTabHeader]',
})
export class BsAccordionTabHeaderDirective {
  readonly template = inject(TemplateRef);
}
