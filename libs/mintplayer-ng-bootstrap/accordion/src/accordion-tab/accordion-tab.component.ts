import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  inject,
  input,
  model,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { BsAccordionComponent } from '../accordion/accordion.component';
import { BsAccordionTabHeaderDirective } from '../accordion-tab-header/accordion-tab-header.directive';

/**
 * `<bs-accordion-tab>` — one tab of a `<bs-accordion>`.
 *
 * It renders nothing in place: its projected children become a template
 * (`body`) that the parent accordion renders inside the tab's `<details>`,
 * together with the `*bsAccordionTabHeader` template. The parent renders
 * every row so the rows are siblings (see `BsAccordionComponent`).
 */
@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { hidden: '' },
})
export class BsAccordionTabComponent {
  readonly accordion = inject(BsAccordionComponent);

  /** Two-way: whether this tab is open. */
  readonly isActive = model<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly headerTemplate = contentChild(BsAccordionTabHeaderDirective);
  /** The tab's projected content, rendered by the parent accordion. */
  readonly body = viewChild<TemplateRef<unknown>>('body');

  /** Position among its siblings. */
  readonly index = computed(() => this.accordion.tabPages().indexOf(this));

  /**
   * Open or close this tab through its `<details>`, so single-open
   * exclusivity and the nested-accordion collapse both apply — unlike
   * writing `isActive` directly.
   */
  setActive(value: boolean): void {
    this.accordion.setActive(this.index(), value);
  }
}
