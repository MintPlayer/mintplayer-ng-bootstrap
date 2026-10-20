import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * `*bsAccordionTabHeader` — declares the header content of the enclosing
 * `<bs-accordion-tab>`.
 *
 * It is a template rather than projected content because the header lands in
 * the row's `<summary>` while the rest of the tab's content lands in the
 * collapsible region, and one `<ng-content>` cannot feed two places. The tab
 * renders the captured template into its summary.
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
