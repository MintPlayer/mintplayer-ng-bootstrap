import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  inject,
  input,
  model,
} from '@angular/core';
import { BsAccordionComponent } from '../accordion/accordion.component';
import { BsAccordionTabHeaderDirective } from '../accordion-tab-header/accordion-tab-header.directive';

/**
 * `<bs-accordion-tab>` — one tab of a `<bs-accordion>`.
 *
 * This host element IS the tab marker the web component reads: it carries
 * `accordion-tab`, its index slot and the tab's state, and its projected
 * children become the tab body. There is no separate `<mp-accordion-tab>`
 * here — an Angular component can only render inside its own host, which
 * would put that element one level too deep to be slotted.
 *
 * The header is declared with `*bsAccordionTabHeader` and rendered by the
 * parent accordion (see `BsAccordionComponent`).
 */
@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'accordion-tab': '',
    '[attr.slot]': '"c" + index()',
    '[attr.is-active]': 'isActive() ? "" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
  },
})
export class BsAccordionTabComponent {
  readonly accordion = inject(BsAccordionComponent);

  /** Two-way: whether this tab is open. */
  readonly isActive = model<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly headerTemplate = contentChild(BsAccordionTabHeaderDirective);

  /** Position among its siblings — the tab's identity for slots and events. */
  readonly index = computed(() => this.accordion.tabPages().indexOf(this));

  /**
   * Open or close this tab through the web component, so single-open
   * exclusivity and the nested-accordion collapse both apply — unlike
   * writing `isActive` directly.
   */
  setActive(value: boolean): void {
    this.accordion.setActive(this.index(), value);
  }
}
