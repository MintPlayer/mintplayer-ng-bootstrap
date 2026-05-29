import { ChangeDetectionStrategy, Component, contentChild, contentChildren, CUSTOM_ELEMENTS_SCHEMA, forwardRef, inject, input, model, computed, signal } from '@angular/core';
import { BsAccordionTabHeaderDirective } from '../accordion-tab-header/accordion-tab-header.directive';
import { BsAccordionComponent } from '../accordion/accordion.component';

/**
 * `<bs-accordion-tab>` is a *marker* element — it sits as a light-DOM child of
 * `<mp-accordion>` and carries the per-tab metadata (`data-tab-id`,
 * `is-active`, `disabled`) that the WC reads via slot inspection. Its host
 * itself is the `${tabId}-content` slotted element, and its projected
 * children become the body of that tab inside the WC's shadow.
 *
 * The header is declared inside the tab via the `*bsAccordionTabHeader`
 * structural directive; the outer `<bs-accordion>` renders each captured
 * header template into a `<span slot="${tabId}-header">` direct child of
 * `<mp-accordion>`.
 */
@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  styleUrls: ['./accordion-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {
    '[attr.data-tab-id]': 'tabName()',
    '[attr.is-active]': 'isActive() ? "" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.slot]': 'tabName() + "-content"',
  },
})
export class BsAccordionTabComponent {
  accordion = inject(BsAccordionComponent);
  accordionTabId = signal<number>(0);
  accordionTabName = computed(() => `${this.accordion.accordionName()}-${this.accordionTabId()}`);
  tabName = this.accordionTabName;
  readonly childAccordions = contentChildren<BsAccordionComponent>(forwardRef(() => BsAccordionComponent));
  readonly headerTemplate = contentChild(BsAccordionTabHeaderDirective);

  constructor() {
    this.accordionTabId.set(++this.accordion.accordionTabCounter);
  }

  isActive = model<boolean>(false);
  disabled = input<boolean>(false);

  /**
   * Imperative state change, preserved for the public `setActive(value)` API.
   * The WC owns the click → state-change loop; this is only for programmatic
   * callers (e.g. legacy code that explicitly opens/closes tabs).
   */
  setActive(value: boolean) {
    if (this.isActive() !== value) {
      this.isActive.set(value);
    }
  }
}
