import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * `*bsAccordionTabHeader` — structural directive used inside `<bs-accordion-tab>`
 * to declare the header content for that tab. The outer `<bs-accordion>`
 * template projects the captured `TemplateRef` into the `<mp-accordion>` WC's
 * `${tabId}-header` named slot.
 *
 * Mirrors the `*bsTabPageHeader` pattern from `bs-tab-control`.
 *
 * Authoring:
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
  template = inject(TemplateRef);
}
